# agent.py - Google Gemini Wrapper for Trading Insights
import os
from dotenv import load_dotenv

load_dotenv()

from tokenc import TokenClient
client = TokenClient(api_key=os.getenv("TOKENC_API_KEY"))

try:
    import google.generativeai as genai
except ImportError:
    genai = None

# Configure Gemini
api_key = os.environ.get("GOOGLE_API_KEY")
if api_key and genai:
    genai.configure(api_key=api_key)

def run_agent(query: str) -> str:
    """
    Generates a short, analytical explanation for trading context using Google Gemini.
    """
    if not genai:
         return "Google Generative AI SDK not installed."
    if not api_key:
         return "Missing GOOGLE_API_KEY environment variable."

    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        system_instruction = (
            "You are a calm, analytical trading assistant for a prediction market dashboard. "
            "Explain correlations and risks clearly and concisely. "
            "No emojis. No hype. No disclaimers. Max 3-5 sentences. "
            "Focus on macro factors or logical connections."
        )

        full_prompt = f"{system_instruction}\n\nQuery: {query}"
        
        compressed = client.compress_input(
            input=full_prompt,
            agressiveness=0.3
        )
        response = model.generate_content(full_prompt)
        return response.text.strip()
            
    except Exception as e:
        # print(f"Agent Error: {e}") # Silent error in prod, or use logging
        return "Unable to generate explanation at the moment."
