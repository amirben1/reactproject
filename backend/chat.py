
# chat.py
from groq import Groq
from fastapi import HTTPException
import json

client = Groq()

system_prompt = """
Vous êtes un expert en audit spécialisé dans tous les types d'audits (qualité, sécurité, environnement, financier, etc.).
Votre rôle est de fournir des réponses précises et professionnelles, basées sur les informations d'audit fournies et l'historique de la conversation.

Règles à suivre :
1. Utilisez un langage clair et professionnel adapté aux audits.
2. Tenez compte de l'historique de la conversation pour fournir des réponses cohérentes.
3. Si une question nécessite des informations manquantes, demandez des précisions.
4. Basez vos réponses sur les informations d'audit suivantes :
   - Transcription : {transcription}
   - Résumé : {summary}
   - Non-conformités : {non_conformities}
   - Processus : {processes}
   - Historique de la conversation : {chat_history}
5.repondre avec la language de la derniere question posée.
6. Si la question est hors sujet ou ne peut pas être traitée, indiquez "Je ne sais pas répondre à cette question."

Exemples de questions que vous pouvez traiter :
- "Quelles sont les non-conformités principales ?"
- "Expliquez les exigences de la norme ISO 14001."
- "Résumez les points positifs de l'audit."
- "Quels sont les risques identifiés lors de l'audit financier ?"
- "Quelles sont les recommandations pour améliorer la conformité ?"
"""

async def handle_chat_query(question: str, context: dict, chat_history: list):
    try:
        formatted_context = "\n".join([f"{k}: {v}" for k, v in context.items()])
        formatted_history = "\n".join(chat_history)

        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt.format(
                    transcription=context.get("transcription", ""),
                    summary=context.get("summary", ""),
                    non_conformities=context.get("non_conformities", ""),
                    processes=context.get("processes", ""),
                    chat_history=formatted_history
                )},
                {"role": "user", "content": question}
            ],
            model="llama3-70b-8192",
            temperature=0.3,
        )
        return {"response": response.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")