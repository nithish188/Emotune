import streamlit as st
import streamlit.components.v1 as components

# Configure the Streamlit page
st.set_page_config(page_title="Emotion AI Dashboard", layout="wide", initial_sidebar_state="collapsed")

# Read the frontend core files
with open("style.css", "r", encoding="utf-8") as f:
    css = f.read()

with open("app.js", "r", encoding="utf-8") as f:
    js = f.read()

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

# Replace local models loading to public CDN repository to work inside Streamlit iframes seamlessly
js = js.replace("const MODEL_URL = './models';", "const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';")

# 1. Remove the defer attribute from face-api so it blocks and loads reliably before our inline script
styled_html = html.replace('<script defer src="https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js"></script>', '<script src="https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js"></script>')

# 2. Inject CSS inline
styled_html = styled_html.replace('<link rel="stylesheet" href="style.css?v=3">', f"<style>{css}</style>")

# 3. Remove the old head script reference
styled_html = styled_html.replace('<script defer src="app.js?v=3"></script>', "")

# 4. Inject JS inline at the bottom of the body so DOM is loaded and faceapi library is fully initialized
styled_html = styled_html.replace('</body>', f'<script>\n{js}\n</script>\n</body>')

# Streamlit natively grants allow="camera; microphone; autoplay;" to components.html rendered frames in its web-server
components.html(styled_html, height=850, scrolling=True)
