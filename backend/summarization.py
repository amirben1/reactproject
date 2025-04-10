# summarization.py
import re
from groq import Groq
from fastapi import HTTPException

client = Groq()

french_prompt = """
Vous allez recevoir une transcription brute d'une réunion d'audit en français, contenant un langage oral informel, des mots de remplissage (euh, donc, etc.), des pauses et des discussions hors sujet. Votre tâche est de résumer les informations clés liées à l'audit dans un format structuré et clair, en éliminant tout contenu inutile. Suivez scrupuleusement la structure et les variables fournies ci-dessous, sans modifier les noms des variables ou les champs. Si une information n'est pas mentionnée dans la transcription, indiquez "Non spécifié".

Structure à suivre :
Audit de [Nom de l'entreprise] ([Adresse]) mené du [Date de début] au [Date de fin] selon la norme [Norme].

Type d'audit: [Type]

Auditeur Principal: [Nom]

Responsable de l'audit: [Nom]

Équipe d’audit: [Noms]

Système de gestion: [Type de système]

Non-conformités détectées: [Nombre]

Détails des non-conformités :
- [Processus] ([Exigence]): [Commentaire] (Évaluation: [Note])
...

Documents de référence :
- [Document 1]
...

Activité auditée: [Description]

Processus audités :
- [Processus 1]
...

Points positifs :
- [Point 1]
...

Recommandations générales :
- [Recommandation 1]
...

Résumé : [Phrase résumant l'état général du système de management]

Instructions supplémentaires :
- Ne modifiez pas les noms des variables (par exemple, "[Nom de l'entreprise]", "[Adresse]", etc.). Utilisez-les exactement comme indiqué.
- Si une information est manquante dans la transcription, indiquez "Non spécifié".
- Conservez la structure et l'ordre des sections exactement comme fourni.
- Évitez d'ajouter ou de supprimer des sections ou des variables.
- Assurez-vous que les données extraites de la transcription sont exactes et non interprétées.
- Pour le type d'audit, déduisez "Audit interne" si l'audit est conduit par une équipe interne, sinon précisez selon le contexte.
- Pour le système de gestion, identifiez le type (ex. "santé et sécurité au travail", "qualité", "environnement") basé sur la norme ou le contexte.
"""

english_prompt = """
You will receive a raw transcription of an audit meeting in English, containing informal spoken language, filler words (um, so, etc.), pauses, and off-topic discussions. Your task is to summarize the key information related to the audit into a structured and clear format, eliminating any unnecessary content. Strictly follow the structure and variables provided below, without modifying the variable names or fields. If information is not mentioned in the transcription, indicate "Not specified".

Structure to follow:
Audit of [Company Name] ([Address]) conducted from [Start Date] to [End Date] according to the [Standard].

Audit Type: [Type]

Lead Auditor: [Name]

Audit Manager: [Name]

Audit Team: [Names]

Management System: [System Type]

Non-conformities detected: [Number]

Details of non-conformities:
- [Process] ([Requirement]): [Comment] (Rating: [Rating])
...

Reference Documents:
- [Document 1]
...

Audited Activity: [Description]

Audited Processes:
- [Process 1]
...

Positive Points:
- [Point 1]
...

General Recommendations:
- [Recommendation 1]
...

Summary: [Sentence summarizing the overall state of the management system]

Additional instructions:
- Do not modify the variable names (e.g., "[Company Name]", "[Address]", etc.). Use them exactly as shown.
- If information is missing in the transcription, indicate "Not specified".
- Keep the structure and order of sections exactly as provided.
- Avoid adding or removing sections or variables.
- Ensure that the data extracted from the transcription is accurate and not interpreted.
- For the audit type, infer "Internal Audit" if the audit is conducted by an internal team, otherwise specify according to the context.
- For the management system, identify the type (e.g., "occupational health and safety", "quality", "environment") based on the standard or context.
"""


async def summarize_audit_transcription(raw_transcription, language: str = "fr"):
    """Summarize an audit transcription into a structured format based on language."""
    if language == "en":
        prompt = english_prompt
    else:
        prompt = french_prompt

    full_prompt = prompt + "\n\nTranscription:\n" + raw_transcription

    try:
        system_message_content = "Vous êtes un assistant spécialisé dans la synthèse de rapports d'audit." # Default French
        if language == "en":
            system_message_content = "You are an assistant specialized in summarizing audit reports." # English System Message


        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_message_content},
                {"role": "user", "content": full_prompt}
            ],
            model="llama3-70b-8192",
            temperature=0.3,  # Lower temperature for more precise output
            max_tokens=8000,
        )
        summary = response.choices[0].message.content

        # Parse the summary into structured data (Parsing logic now language-aware)
        structured_data = {}
        if language == "en":
            client_match = re.search(r"Audit of (.+?) \((.+?)\)", summary)
            period_match = re.search(r"conducted from (.+?) to (.+?) according", summary)
            standard_match = re.search(r"according to the (.+?)\.", summary)
            type_match = re.search(r"Audit Type: (.+)", summary)
            auditor_match = re.search(r"Lead Auditor: (.+)", summary)
            manager_match = re.search(r"Audit Manager: (.+)", summary)
            team_match = re.search(r"Audit Team: (.+)", summary)
            system_match = re.search(r"Management System: (.+)", summary)
            nonconf_match = re.search(r"Non-conformities detected: (\d+)", summary)
        else:
            client_match = re.search(r"Audit de (.+?) \((.+?)\)", summary)
            period_match = re.search(r"mené du (.+?) au (.+?) selon", summary)
            standard_match = re.search(r"selon la norme (.+?)\.", summary)
            type_match = re.search(r"Type d'audit: (.+)", summary)
            auditor_match = re.search(r"Auditeur Principal: (.+)", summary)
            manager_match = re.search(r"Responsable de l'audit: (.+)", summary)
            team_match = re.search(r"Équipe d'audit: (.+)", summary)
            system_match = re.search(r"Système de gestion: (.+)", summary)
            nonconf_match = re.search(r"Non-conformités détectées: (\d+)", summary)

        structured_data["client_name"] = client_match.group(1) if client_match else "Non spécifié" if language == "fr" else "Not specified"
        structured_data["client_address"] = client_match.group(2) if client_match else "Non spécifié" if language == "fr" else "Not specified"

        start_date = period_match.group(1) if period_match else "Non spécifié" if language == "fr" else "Not specified"
        end_date = period_match.group(2) if period_match else "Non spécifié" if language == "fr" else "Not specified"
        structured_data["audit_period"] = f"{start_date} - {end_date}"

        standard_match = re.search(r"norme (.+?)\.", summary) if language == "en" else re.search(r"norme (.+?)\.", summary) # both prompts use "norme" before the standard.
        structured_data["reference_standard"] = standard_match.group(1) if standard_match else "Non spécifié" if language == "fr" else "Not specified"

        audit_type_regex = r"Audit Type: (.+)" if language == "en" else r"Type d'audit: (.+)"
        type_match = re.search(audit_type_regex, summary)
        structured_data["audit_type"] = type_match.group(1) if type_match else "Non spécifié" if language == "fr" else "Not specified"

        auditor_name_regex = r"Lead Auditor: (.+)" if language == "en" else r"Auditeur Principal: (.+)"
        auditor_match = re.search(auditor_name_regex, summary)
        structured_data["auditor_name"] = auditor_match.group(1) if auditor_match else "Non spécifié" if language == "fr" else "Not specified"

        audit_manager_regex = r"Audit Manager: (.+)" if language == "en" else r"Responsable de l'audit: (.+)"
        manager_match = re.search(audit_manager_regex, summary)
        structured_data["audit_manager"] = manager_match.group(1) if manager_match else "Non spécifié" if language == "fr" else "Not specified"

        audit_team_regex = r"Audit Team: (.+)" if language == "en" else r"Équipe d'audit: (.+)"
        team_match = re.search(audit_team_regex, summary)
        structured_data["audit_team_members"] = team_match.group(1) if team_match else "Non spécifié" if language == "fr" else "Not specified"

        management_system_regex = r"Management System: (.+)" if language == "en" else r"Système de gestion: (.+)"
        system_match = re.search(management_system_regex, summary)
        structured_data["management_system"] = system_match.group(1) if system_match else "Non spécifié" if language == "fr" else "Not specified"

        non_conformities_regex = r"Non-conformities detected: (\d+)" if language == "en" else r"Non-conformités détectées: (\d+)"
        nonconf_match = re.search(non_conformities_regex, summary)
        structured_data["non_conformities_count"] = nonconf_match.group(1) if nonconf_match else "0"

        lines = summary.split("\n")
        compliance_items = []
        reference_documents = []
        processes_list = []
        positive_points = []
        recommendations = []
        resume = ""
        activity_description = ""
        current_section = None

        for line in lines:
            line = line.strip()
            if language == "en":
                if line.startswith("Details of non-conformities:"):
                    current_section = "compliance"
                elif line.startswith("Reference Documents:"):
                    current_section = "documents"
                elif line.startswith("Audited Activity:"):
                    activity_description = line.split(":", 1)[1].strip()
                elif line.startswith("Audited Processes:"):
                    current_section = "processes"
                elif line.startswith("Positive Points:"):
                    current_section = "positive"
                elif line.startswith("General Recommendations:"):
                    current_section = "recommendations"
                elif line.startswith("Summary:"):
                    resume = line.split(":", 1)[1].strip()
            else:
                if line.startswith("Détails des non-conformités :"):
                    current_section = "compliance"
                elif line.startswith("Documents de référence :"):
                    current_section = "documents"
                elif line.startswith("Activité auditée:"):
                    activity_description = line.split(":", 1)[1].strip()
                elif line.startswith("Processus audités :"):
                    current_section = "processes"
                elif line.startswith("Points positifs :"):
                    current_section = "positive"
                elif line.startswith("Recommandations générales :"):
                    current_section = "recommendations"
                elif line.startswith("Résumé :"):
                    resume = line.split(":", 1)[1].strip()
            if line and current_section == "compliance" and line.startswith("-"):
                parts = line[2:].split(":", 1)
                process_req = parts[0].strip()
                comment_rating = parts[1].strip()
                process_match = re.match(r"(.+?) \((.+?)\)", process_req)
                process = process_match.group(1) if process_match else process_req
                requirement_text = "Not specified" if language == "en" else "Non spécifié"
                requirement = process_match.group(2) if process_match else requirement_text

                if language == "en":
                    comment_match = re.match(r"(.+?) \(Rating: (.+?)\)", comment_rating)
                    rating_text = "Not specified"
                    no_info_text = "No information"
                else:
                    comment_match = re.match(r"(.+?) \(Évaluation: (.+?)\)", comment_rating)
                    rating_text = "Non spécifié"
                    no_info_text = "Aucune information"

                comment = comment_match.group(1) if comment_match else comment_rating
                rating = comment_match.group(2) if comment_match else rating_text
                compliance_items.append({"process": process, "requirement": requirement, "comment": comment, "rating": rating})
            elif line and current_section in ["documents", "processes", "positive", "recommendations"] and line.startswith("- "):
                item = line[2:].strip()
                if current_section == "documents":
                    reference_documents.append(item)
                elif current_section == "processes":
                    processes_list.append(item)
                elif current_section == "positive":
                    positive_points.append(item)
                elif current_section == "recommendations":
                    recommendations.append(item)

        not_specified = "Not specified" if language == "en" else "Non spécifié"
        no_info = "No information" if language == "en" else "Aucune information"
        no_positive = "No positive points mentioned" if language == "en" else "Aucun point positif mentionné"
        no_recommendations = "No recommendations provided" if language == "en" else "Aucune recommandation fournie"
        no_summary = "No summary provided" if language == "en" else "Aucun résumé fourni"

        structured_data["reference_documents"] = reference_documents or [not_specified]
        structured_data["activity_description"] = activity_description or not_specified
        structured_data["processes_list"] = processes_list or [not_specified]
        structured_data["compliance_items"] = compliance_items or [{"process": not_specified, "requirement": "N/A", "comment": no_info, "rating": "N/A"}]
        structured_data["positive_points"] = positive_points or [no_positive]
        structured_data["recommendations"] = recommendations or [no_recommendations]
        structured_data["resume"] = resume or no_summary

        return {"summary": summary, "structured_data": structured_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summarization error: {str(e)}")