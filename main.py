import json
import re
import logging
from typing import Dict, Any, Optional
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import ollama
from bs4 import BeautifulSoup

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Browser Automation API", version="2.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Request(BaseModel):
    prompt: str = Field(..., description="User instruction")
    page_html: Optional[str] = Field(None, description="Full page HTML")
    page_text: Optional[str] = Field(None, description="Page text content")
    page_url: Optional[str] = Field(None, description="Current page URL")
    page_title: Optional[str] = Field(None, description="Page title")


class PageAnalyzer:
    """Analyzes page content and extracts structured data"""
    
    @staticmethod
    def extract_links(html: str) -> list:
        """Extract all links from HTML"""
        soup = BeautifulSoup(html, 'html.parser')
        links = []
        for a in soup.find_all('a', href=True):
            links.append({
                'text': a.get_text(strip=True),
                'href': a['href'],
                'title': a.get('title', '')
            })
        return links
    
    @staticmethod
    def extract_images(html: str) -> list:
        """Extract all images from HTML"""
        soup = BeautifulSoup(html, 'html.parser')
        images = []
        for img in soup.find_all('img'):
            images.append({
                'src': img.get('src', ''),
                'alt': img.get('alt', ''),
                'title': img.get('title', '')
            })
        return images
    
    @staticmethod
    def extract_headings(html: str) -> list:
        """Extract all headings from HTML"""
        soup = BeautifulSoup(html, 'html.parser')
        headings = []
        for level in range(1, 7):
            for h in soup.find_all(f'h{level}'):
                headings.append({
                    'level': f'h{level}',
                    'text': h.get_text(strip=True)
                })
        return headings
    
    @staticmethod
    def extract_forms(html: str) -> list:
        """Extract form information"""
        soup = BeautifulSoup(html, 'html.parser')
        forms = []
        for form in soup.find_all('form'):
            fields = []
            for inp in form.find_all(['input', 'textarea', 'select']):
                fields.append({
                    'type': inp.get('type', inp.name.lower()),
                    'name': inp.get('name', ''),
                    'id': inp.get('id', ''),
                    'placeholder': inp.get('placeholder', '')
                })
            forms.append({
                'action': form.get('action', ''),
                'method': form.get('method', 'get'),
                'fields': fields
            })
        return forms
    
    @staticmethod
    def extract_by_selector(html: str, selector: str) -> list:
        """Extract elements by CSS selector"""
        soup = BeautifulSoup(html, 'html.parser')
        elements = soup.select(selector)
        return [{'text': el.get_text(strip=True), 'html': str(el)} for el in elements]
    
    @staticmethod
    def extract_metadata(html: str) -> dict:
        """Extract page metadata"""
        soup = BeautifulSoup(html, 'html.parser')
        metadata = {}
        
        # Meta tags
        for meta in soup.find_all('meta'):
            name = meta.get('name') or meta.get('property', '')
            content = meta.get('content', '')
            if name and content:
                metadata[name] = content
        
        return metadata


class AIProcessor:
    """Handles AI model interactions"""
    
    def __init__(self, model: str = "llama3"):
        self.model = model
        self.system_instruction = self._load_system_instruction()
        self.page_analyzer = PageAnalyzer()
    
    @staticmethod
    def _load_system_instruction() -> str:
        """Load system instruction from file"""
        instruction_file = Path(__file__).parent / "prompts" / "systemInstruction.txt"
        if instruction_file.exists():
            return instruction_file.read_text(encoding="utf-8")
        return ""
    
    def preprocess_query(self, request: Request) -> Optional[Dict[str, Any]]:
        """
        Check if query can be answered directly without AI
        Returns action dict if can be handled, None otherwise
        """
        prompt_lower = request.prompt.lower()
        
        # Direct extraction queries
        if 'all links' in prompt_lower or 'get links' in prompt_lower:
            links = self.page_analyzer.extract_links(request.page_html)
            return {'action': 'query', 'data': links}
        
        if 'all images' in prompt_lower or 'get images' in prompt_lower:
            images = self.page_analyzer.extract_images(request.page_html)
            return {'action': 'query', 'data': images}
        
        if 'headings' in prompt_lower or 'headers' in prompt_lower:
            headings = self.page_analyzer.extract_headings(request.page_html)
            return {'action': 'query', 'data': headings}
        
        if 'forms' in prompt_lower or 'form fields' in prompt_lower:
            forms = self.page_analyzer.extract_forms(request.page_html)
            return {'action': 'query', 'data': forms}
        
        if 'metadata' in prompt_lower or 'meta tags' in prompt_lower:
            metadata = self.page_analyzer.extract_metadata(request.page_html)
            return {'action': 'query', 'data': metadata}
        
        # CSS selector queries
        selector_match = re.search(r'selector[:\s]+([^\s]+)', prompt_lower)
        if selector_match:
            selector = selector_match.group(1)
            elements = self.page_analyzer.extract_by_selector(request.page_html, selector)
            return {'action': 'query', 'data': elements}
        
        return None
    
    def build_context(self, request: Request) -> str:
        """Build comprehensive context for AI"""
        context_parts = [f"USER INSTRUCTION: {request.prompt}\n"]
        
        if request.page_url:
            context_parts.append(f"CURRENT PAGE URL: {request.page_url}")
        
        if request.page_title:
            context_parts.append(f"PAGE TITLE: {request.page_title}")
        
        # Add relevant page content (limit size)
        if request.page_text:
            text_preview = request.page_text[:3000]  # Limit to 3000 chars
            context_parts.append(f"\nPAGE TEXT CONTENT:\n{text_preview}")
        
        # Add structural info
        if request.page_html:
            soup = BeautifulSoup(request.page_html, 'html.parser')
            
            # Extract button texts for click actions
            buttons = [btn.get_text(strip=True) for btn in soup.find_all(['button', 'a']) if btn.get_text(strip=True)]
            if buttons:
                context_parts.append(f"\nAVAILABLE BUTTONS/LINKS: {', '.join(buttons[:20])}")
            
            # Extract input fields for form filling
            inputs = []
            for inp in soup.find_all(['input', 'textarea', 'select']):
                field_info = {
                    'name': inp.get('name', ''),
                    'id': inp.get('id', ''),
                    'type': inp.get('type', ''),
                    'placeholder': inp.get('placeholder', '')
                }
                inputs.append(field_info)
            
            if inputs:
                context_parts.append(f"\nAVAILABLE FORM FIELDS: {json.dumps(inputs[:15], indent=2)}")
        
        return "\n".join(context_parts)
    
    def parse_ai_response(self, raw_content: str) -> Dict[str, Any]:
        """Parse and validate AI response"""
        try:
            # Remove markdown code blocks if present
            raw_content = re.sub(r'^```json?\s*', '', raw_content, flags=re.MULTILINE)
            raw_content = re.sub(r'\s*```$', '', raw_content, flags=re.MULTILINE)
            
            # Extract JSON from text
            json_match = re.search(r'\{.*\}', raw_content, re.DOTALL)
            if not json_match:
                logger.error(f"No JSON found in response: {raw_content}")
                return {
                    'error': 'Invalid AI response format',
                    'raw': raw_content
                }
            
            json_text = json_match.group(0)
            
            # Unescape if double-quoted
            if (json_text.startswith('"') and json_text.endswith('"')) or \
               (json_text.startswith("'") and json_text.endswith("'")):
                json_text = json_text[1:-1].replace('\\"', '"')
            
            # Parse JSON
            response_json = json.loads(json_text)
            
            # Validate structure
            if 'action' not in response_json:
                return {'error': 'Missing "action" field in response'}
            
            return response_json
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}\nContent: {raw_content}")
            return {
                'error': f'Failed to parse JSON: {str(e)}',
                'raw': raw_content
            }
        except Exception as e:
            logger.error(f"Unexpected error parsing response: {e}")
            return {'error': str(e)}
    
    def process_request(self, request: Request) -> Dict[str, Any]:
        """Main processing logic"""
        try:
            # Try direct preprocessing first
            direct_result = self.preprocess_query(request)
            if direct_result:
                logger.info(f"Direct query handled: {request.prompt[:50]}")
                return direct_result
            
            # Build context for AI
            context = self.build_context(request)
            
            # Call AI model
            logger.info(f"Calling AI model for: {request.prompt[:50]}")
            response = ollama.chat(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.system_instruction},
                    {"role": "user", "content": context}
                ]
            )
            
            raw_content = response.message.content.strip()
            logger.debug(f"Raw AI response: {raw_content}")
            
            # Parse and return
            return self.parse_ai_response(raw_content)
            
        except Exception as e:
            logger.error(f"Error processing request: {e}", exc_info=True)
            return {'error': f'Processing error: {str(e)}'}


# Initialize AI processor
ai_processor = AIProcessor()


@app.get("/")
def root():
    """Health check endpoint"""
    return {
        "status": "running",
        "service": "AI Browser Automation API",
        "version": "2.0"
    }


@app.post("/ask")
def ask(request: Request) -> Dict[str, Any]:
    """
    Main endpoint for processing automation requests
    """
    try:
        if not request.prompt:
            raise HTTPException(status_code=400, detail="Prompt is required")
        
        logger.info(f"Received request: {request.prompt[:100]}")
        
        # Process the request
        result = ai_processor.process_request(request)
        
        logger.info(f"Response action: {result.get('action', 'error')}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in /ask endpoint: {e}", exc_info=True)
        return {"error": f"Server error: {str(e)}"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")