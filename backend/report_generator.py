# report_generator.py
from reportlab.lib import colors # type: ignore
from reportlab.lib.pagesizes import A4 # type: ignore
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle # type: ignore
from reportlab.lib.units import inch, cm, mm # type: ignore
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image # type: ignore
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY # type: ignore
from reportlab.pdfbase import pdfmetrics # type: ignore
from reportlab.pdfbase.ttfonts import TTFont # type: ignore
from datetime import datetime
import os
from fastapi import HTTPException # type: ignore

class AuditReportGenerator:
    def __init__(self):
        # Register custom fonts (assuming these fonts are available in the system)
        try:
            pdfmetrics.registerFont(TTFont('Montserrat', 'Montserrat-Regular.ttf'))
            pdfmetrics.registerFont(TTFont('Montserrat-Bold', 'Montserrat-Bold.ttf'))
            pdfmetrics.registerFont(TTFont('Montserrat-Light', 'Montserrat-Light.ttf'))
            pdfmetrics.registerFont(TTFont('Montserrat-Italic', 'Montserrat-Italic.ttf'))
            
            # Set font family names for use
            self.base_font = 'Montserrat'
            self.bold_font = 'Montserrat-Bold'
            self.light_font = 'Montserrat-Light'
            self.italic_font = 'Montserrat-Italic'
        except:
            # Fallback to standard fonts if custom fonts are not available
            self.base_font = 'Helvetica'
            self.bold_font = 'Helvetica-Bold'
            self.light_font = 'Helvetica'
            self.italic_font = 'Helvetica-Oblique'
            
        # Define modern color scheme
        self.primary_color = colors.HexColor('#1a365d')  # Dark blue
        self.secondary_color = colors.HexColor('#2c5282')  # Medium blue
        self.accent_color = colors.HexColor('#3182ce')  # Bright blue
        self.text_color = colors.HexColor('#2d3748')  # Dark gray
        self.light_color = colors.HexColor('#e2e8f0')  # Light gray
        
        # Initialize styles
        self.styles = getSampleStyleSheet()
        
        # Define custom styles for the report
        self.title_style = ParagraphStyle(
            'CustomTitle',
            parent=self.styles['Title'],
            fontSize=20,
            spaceAfter=24,
            alignment=TA_CENTER,
            fontName=self.bold_font,
            textColor=self.primary_color
        )
        
        self.subtitle_style = ParagraphStyle(
            'CustomSubTitle',
            parent=self.styles['Title'],
            fontSize=16,
            spaceAfter=20,
            alignment=TA_CENTER,
            fontName=self.light_font,
            textColor=self.secondary_color
        )
        
        self.header_style = ParagraphStyle(
            'CustomHeader',
            parent=self.styles['Heading2'],
            fontSize=16,
            spaceAfter=16,
            fontName=self.bold_font,
            textColor=self.primary_color,
            borderWidth=0,
            borderColor=self.accent_color,
            borderPadding=10,
            leading=20
        )
        
        self.subheader_style = ParagraphStyle(
            'CustomSubHeader',
            parent=self.styles['Heading3'],
            fontSize=14,
            spaceAfter=12,
            fontName=self.bold_font,
            textColor=self.secondary_color,
            leading=18
        )
        
        self.normal_style = ParagraphStyle(
            'CustomNormal',
            parent=self.styles['Normal'],
            fontSize=11,
            fontName=self.base_font,
            textColor=self.text_color,
            leading=16,
            alignment=TA_JUSTIFY
        )
        
        self.bullet_style = ParagraphStyle(
            'BulletStyle',
            parent=self.normal_style,
            leftIndent=20,
            firstLineIndent=0,
            spaceBefore=2,
            spaceAfter=2
        )
        
        self.table_header_style = ParagraphStyle(
            'TableHeader',
            parent=self.styles['Normal'],
            fontSize=11,
            fontName=self.bold_font,
            textColor=colors.white,
            alignment=TA_CENTER
        )
        
        self.table_cell_style = ParagraphStyle(
            'TableCell',
            parent=self.normal_style,
            fontSize=10,
            leading=14
        )
        
        self.footer_style = ParagraphStyle(
            'Footer',
            parent=self.styles['Normal'],
            fontSize=8,
            fontName=self.light_font,
            textColor=self.secondary_color,
            alignment=TA_CENTER
        )
        
        self.toc_style = ParagraphStyle(
            'TOCEntry',
            parent=self.styles['Normal'],
            fontSize=12,
            fontName=self.base_font,
            textColor=self.text_color,
            leading=20
        )

    def create_header_footer(self, canvas, doc):
        """Add modern header and footer to each page."""
        canvas.saveState()
        width, height = A4
        
        # Header with gradient bar
        canvas.setFillColorRGB(0.75, 0.75, 0.75, 0.1)  # Very light gray background
        canvas.rect(0, height - 50, width, 50, fill=1, stroke=0)
        
        # Gradient line
        canvas.setStrokeColor(self.accent_color)
        canvas.setLineWidth(3)
        canvas.line(doc.leftMargin, height - 50, width - doc.rightMargin, height - 50)
        
        # Header text
        canvas.setFont(self.bold_font, 10)
        canvas.setFillColor(self.primary_color)
        canvas.drawString(doc.leftMargin, height - 35, 
                         "Rapport d'Audit Interne")
        
        # Current page / total pages
        page_num = canvas.getPageNumber()
        text = f"Page {page_num} sur {self.total_pages}"
        canvas.setFont(self.base_font, 9)
        canvas.drawRightString(width - doc.rightMargin, height - 35, text)
        
        # Footer with line
        canvas.setStrokeColor(self.light_color)
        canvas.setLineWidth(1)
        canvas.line(doc.leftMargin, doc.bottomMargin - 20, width - doc.rightMargin, doc.bottomMargin - 20)
        
        # Footer text
        revision_text = f"Rev. {self.data.get('version', '1.0')} ({self.data.get('year', datetime.now().strftime('%Y'))}-{self.data.get('month', datetime.now().strftime('%m'))}) {self.data.get('expiry_date', '')}"
        canvas.setFont(self.light_font, 8)
        canvas.setFillColor(self.text_color)
        canvas.drawString(doc.leftMargin, doc.bottomMargin - 35, revision_text)
        
        # Company name on the right of footer
        company_name = self.data.get('client_name', 'Non spécifié')
        canvas.drawRightString(width - doc.rightMargin, doc.bottomMargin - 35, company_name)
        
        canvas.restoreState()

    def create_cover_page(self, story, data):
        """Create a modern cover page."""
        # Background rectangle for visual appeal
        story.append(Spacer(1, 40))
        
        # Title with modern styling
        story.append(Paragraph("RAPPORT D'AUDIT INTERNE", self.title_style))
        story.append(Paragraph("SYSTÈME DE MANAGEMENT", self.subtitle_style))
        story.append(Paragraph(data.get('management_system', 'DE LA QUALITÉ').upper(), self.subtitle_style))
        
        story.append(Spacer(1, 40))
        
        # Client info in a styled table
        client_info = [
            ["CLIENT", data.get('client_name', 'Non spécifié')],
            ["ADRESSE", data.get('client_address', 'Non spécifié')],
            ["PÉRIODE D'AUDIT", data.get('audit_period', 'Non spécifié')],
            ["RÉFÉRENTIEL", data.get('reference_standard', 'ISO 9001:2015')]
        ]
        
        client_table = Table(client_info, colWidths=[4*cm, 10*cm])
        client_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), self.light_color),
            ('TEXTCOLOR', (0, 0), (0, -1), self.primary_color),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), self.bold_font),
            ('FONTNAME', (1, 0), (1, -1), self.base_font),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('LEFTPADDING', (0, 0), (0, -1), 15),
            ('RIGHTPADDING', (0, 0), (0, -1), 15),
            ('LEFTPADDING', (1, 0), (1, -1), 20),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOX', (0, 0), (-1, -1), 1, self.light_color),
            ('LINEBELOW', (0, 0), (-1, -2), 1, self.light_color),
        ]))
        story.append(client_table)
        
        story.append(Spacer(1, 60))
        
        # Report type with modern checkbox
        report_type_text = "TYPE DE RAPPORT:"
        story.append(Paragraph(report_type_text, self.subheader_style))
        
        report_types = [["☑  Rapport d'audit interne"]]
        report_type_table = Table(report_types, colWidths=[10*cm])
        report_type_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('FONTNAME', (0, 0), (0, 0), self.base_font),
            ('FONTSIZE', (0, 0), (0, 0), 12),
            ('BOTTOMPADDING', (0, 0), (0, 0), 5),
            ('TOPPADDING', (0, 0), (0, 0), 5),
        ]))
        story.append(report_type_table)
        
        story.append(Spacer(1, 60))
        
        # Date and audit signature
        current_date = datetime.now().strftime("%d.%m.%Y")
        date_text = f"Date du rapport: {current_date}"
        story.append(Paragraph(date_text, self.normal_style))
        
        story.append(Spacer(1, 10))
        
        # Signature box
        signature_data = [
            ["Responsable d'audit: ", data.get('audit_manager', 'Non spécifié')],
        ]
        signature_table = Table(signature_data, colWidths=[4*cm, 8*cm])
        signature_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, 0), self.bold_font),
            ('FONTNAME', (1, 0), (1, 0), self.base_font),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('ALIGN', (0, 0), (0, 0), 'RIGHT'),
            ('ALIGN', (1, 0), (1, 0), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(signature_table)
        
        story.append(PageBreak())

    def create_toc(self, story):
        """Create a modern table of contents."""
        story.append(Paragraph("TABLE DES MATIÈRES", self.header_style))
        story.append(Spacer(1, 20))
        
        toc_data = [
            ["1. Evaluation Sommaire", ""],
            ["2. Objectif, Base et Domaine d'Application de l'Audit", ""],
            ["3. Approche de l'Audit Interne", ""],
            ["4. Evaluation de la Conformité par Rapport au Référentiel", ""],
            ["5. Points Positifs / Potentiel d'Amélioration", ""],
            ["6. Conclusion", ""],
            ["7. Remarques Générales", ""]
        ]
        
        # Create TOC with dotted leaders
        for item in toc_data:
            section = item[0]
            page = item[1]
            
            p = Paragraph(
                f'{section}<dotfill>{page}',
                self.toc_style
            )
            story.append(p)
            story.append(Spacer(1, 10))
        
        story.append(PageBreak())

    async def create_report(self, output_path, data):
        """Create the complete audit report with modern design asynchronously."""
        self.data = data  # Store data for access in header/footer
        self.total_pages = 7  # Estimated total pages
        
        # Ensure output directory exists
        output_dir = os.path.dirname(output_path)
        if not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)

        try:
            # Initialize PDF document with modern margins
            pdf_doc = SimpleDocTemplate(
                output_path,
                pagesize=A4,
                rightMargin=2*cm,
                leftMargin=2*cm,
                topMargin=4*cm,
                bottomMargin=3*cm
            )

            # Calculate available width for tables (A4 width - margins)
            page_width = A4[0]  # 21cm (210mm)
            available_width = page_width - pdf_doc.leftMargin - pdf_doc.rightMargin

            # Validate critical table widths here (e.g., compliance table)
            compliance_col_widths = [2.5*cm, 2.5*cm, 9*cm, 3*cm]
            total_width = sum(compliance_col_widths)
            if total_width > available_width:
                raise ValueError(
                    f"Compliance table width ({total_width}cm) exceeds available space ({available_width}cm)."
                )

            story = []

            # Create modern cover page
            self.create_cover_page(story, data)
            
            # Create modern table of contents
            self.create_toc(story)

            # Section 1: Evaluation sommaire with improved styling
            story.append(Paragraph("1. Evaluation Sommaire", self.header_style))
            story.append(Spacer(1, 15))
            
            # Client info in a modern table
            client_info = [
                ["Client", data.get('client_name', 'Non spécifié')],
                ["Site d'audit", data.get('audit_site', 'Non spécifié')],
                ["Chargé(e) d'audit", data.get('auditor_name', 'Non spécifié')],
                ["Référentiel", data.get('reference_standard', 'ISO 9001:2015')],
                ["Type Audit", data.get('audit_type', 'Audit interne')],
                ["Période Audit", data.get('audit_period', 'Non spécifié')],
                ["Resp. d'audit", data.get('audit_manager', 'Non spécifié')],
                ["Equipe d'audit", data.get('audit_team_members', 'Non spécifié')]
            ]
            
            client_table = Table(client_info, colWidths=[5*cm, 12*cm])
            client_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), self.light_color),
                ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
                ('ALIGN', (1, 0), (1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (0, -1), self.bold_font),
                ('FONTNAME', (1, 0), (1, -1), self.base_font),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('LEFTPADDING', (0, 0), (0, -1), 10),
                ('RIGHTPADDING', (0, 0), (0, -1), 10),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -1), 0.5, self.light_color),
            ]))
            story.append(client_table)
            story.append(Spacer(1, 15))
            
            # Summary with improved formatting
            summary_text = f"""Dans le cadre d'un audit interne de l'entreprise {data.get('client_name', 'Non spécifié')}, sise {data.get('client_address', 'Non spécifié')} a fourni l'évidence qu'elle a implémenté et améliore un système de management de {data.get('management_system', 'la qualité')} partiellement conforme aux référentiels mentionnés ci-dessus."""
            story.append(Paragraph(summary_text, self.normal_style))
            story.append(Spacer(1, 12))
            
            # Non-conformities summary in a highlighted box
            nonconf_text = f"{data.get('non_conformities_count', '0')} Non-conformités dans différents chapitres de la norme ont été détectées et documentées dans ce rapport."
            nonconf_para = Paragraph(nonconf_text, self.normal_style)
            nonconf_table = Table([[nonconf_para]], colWidths=[15*cm])
            nonconf_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), self.light_color),
                ('FONTNAME', (0, 0), (-1, -1), self.bold_font),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
                ('TOPPADDING', (0, 0), (-1, -1), 10),
                ('LEFTPADDING', (0, 0), (-1, -1), 15),
                ('RIGHTPADDING', (0, 0), (-1, -1), 15),
                ('BOX', (0, 0), (-1, -1), 1, self.accent_color),
            ]))
            story.append(nonconf_table)
            story.append(Spacer(1, 20))
            
            # Signature block with modern styling
            current_date = datetime.now().strftime("%d.%m.%Y")
            signature_data = [
                [current_date, "", data.get('audit_manager', 'Non spécifié')],
                ["Date", "", "Resp. d'audit"]
            ]
            signature_table = Table(signature_data, colWidths=[3*cm, 5*cm, 3*cm])
            signature_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (0, 0), self.base_font),
                ('FONTNAME', (2, 0), (2, 0), self.base_font),
                ('FONTNAME', (0, 1), (0, 1), self.italic_font),
                ('FONTNAME', (2, 1), (2, 1), self.italic_font),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
                ('LINEABOVE', (0, 1), (0, 1), 0.5, self.text_color),
                ('LINEABOVE', (2, 1), (2, 1), 0.5, self.text_color),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ]))
            story.append(signature_table)
            story.append(PageBreak())

            # Section 2: Objectives and Scope with improved styling
            story.append(Paragraph("2. Objectif, Base et Domaine d'Application de l'Audit", self.header_style))
            story.append(Spacer(1, 15))
            
            objective_text = f"L'objectif de l'audit était de vérifier que les exigences des référentiels relatifs au système de management de {data.get('management_system', 'la qualité')} sont satisfaites et que les conditions de fonctionnement sont remplies."
            story.append(Paragraph(objective_text, self.normal_style))
            story.append(Spacer(1, 15))
            
            # Reference documents in a styled box
            story.append(Paragraph("Les documents suivants ont constitué la base de l'audit :", self.normal_style))
            story.append(Spacer(1, 5))
            
            docs_list = []
            for doc in data.get('reference_documents', []):
                docs_list.append([Paragraph(f"• {doc}", self.bullet_style)])
            
            if docs_list:
                docs_table = Table(docs_list, colWidths=[15*cm])
                docs_table.setStyle(TableStyle([
                    ('LEFTPADDING', (0, 0), (-1, -1), 10),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                    ('TOPPADDING', (0, 0), (-1, -1), 5),
                ]))
                story.append(docs_table)
            
            story.append(Spacer(1, 15))
            
            # Application domain with modern subheader
            story.append(Paragraph("Domaine d'application", self.subheader_style))
            domain_text = f"L'audit concerne le site sis à {data.get('audit_site', 'Non spécifié')}, pour l'activité {data.get('activity_description', 'Non spécifié')}."
            story.append(Paragraph(domain_text, self.normal_style))
            story.append(Spacer(1, 10))
            
            # Process list in a styled box
            story.append(Paragraph("Processus inclus :", self.normal_style))
            story.append(Spacer(1, 5))
            
            process_list = []
            for process in data.get('processes_list', []):
                process_list.append([Paragraph(f"• {process}", self.bullet_style)])
            
            if process_list:
                process_table = Table(process_list, colWidths=[15*cm])
                process_table.setStyle(TableStyle([
                    ('LEFTPADDING', (0, 0), (-1, -1), 10),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                    ('TOPPADDING', (0, 0), (-1, -1), 5),
                ]))
                story.append(process_table)
            
            story.append(PageBreak())

            # Section 3 & 4: Audit Approach and Compliance with modern styling
            story.append(Paragraph("3. Approche de l'Audit Interne", self.header_style))
            story.append(Spacer(1, 15))
            
            # Approach description in a highlighted box
            approach_text = "L'audit a été réalisé par échantillonnage, en vérifiant la conformité des processus par des entretiens et l'examen des documents."
            approach_para = Paragraph(approach_text, self.normal_style)
            approach_table = Table([[approach_para]], colWidths=[15*cm])
            approach_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), self.light_color),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
                ('TOPPADDING', (0, 0), (-1, -1), 10),
                ('LEFTPADDING', (0, 0), (-1, -1), 15),
                ('RIGHTPADDING', (0, 0), (-1, -1), 15),
                ('BOX', (0, 0), (-1, -1), 1, self.light_color),
            ]))
            story.append(approach_table)
            story.append(Spacer(1, 20))
            
            # Section 4: Compliance evaluation with modern table
            story.append(Paragraph("4. Evaluation de la Conformité par Rapport au Référentiel", self.header_style))
            story.append(Spacer(1, 15))
            
            # Modern compliance table with improved styling
            compliance_headers = [
                [Paragraph("Processus", self.table_header_style),
                 Paragraph("Exigence", self.table_header_style),
                 Paragraph("Commentaire", self.table_header_style),
                 Paragraph("Evaluation", self.table_header_style)]
            ]
            
            compliance_data = []
            for idx, item in enumerate(data.get('compliance_items', [])):
                # Alternate row colors for better readability
                row = [
                    Paragraph(item.get('process', 'Non spécifié'), self.table_cell_style),
                    Paragraph(item.get('requirement', 'N/A'), self.table_cell_style),
                    Paragraph(item.get('comment', 'Aucune information'), self.table_cell_style),
                    Paragraph(item.get('rating', 'N/A'), self.table_cell_style)
                ]
                compliance_data.append(row)
            
            compliance_table_data = compliance_headers + compliance_data
            compliance_table = Table(
                    compliance_table_data,
                    colWidths=compliance_col_widths,
                    splitByRow=True,
                    repeatRows=1
                )
            
            row_styles = []
            # Header row style
            row_styles.append(('BACKGROUND', (0, 0), (-1, 0), self.primary_color))
            row_styles.append(('TEXTCOLOR', (0, 0), (-1, 0), colors.white))
            
            # Alternate row colors
            for i in range(1, len(compliance_table_data)):
                if i % 2 == 0:
                    bg_color = self.light_color
                else:
                    bg_color = colors.white
                row_styles.append(('BACKGROUND', (0, i), (-1, i), bg_color))
            
            # Apply all styles
            compliance_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                ('ALIGN', (3, 1), (3, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -1), 0.5, self.text_color),
                ('BOX', (0, 0), (-1, -1), 1, self.primary_color),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('LEFTPADDING', (0, 0), (-1, -1), 3),
                ('RIGHTPADDING', (0, 0), (-1, -1), 3),
            ] + row_styles))
            
            story.append(compliance_table)
            story.append(PageBreak())

            # Section 5 & 6: Positive Points and Conclusion with modern styling
            story.append(Paragraph("5. Points Positifs / Potentiel d'Amélioration", self.header_style))
            story.append(Spacer(1, 15))
            
            # Positive points in a styled box
            story.append(Paragraph("Points positifs :", self.subheader_style))
            story.append(Spacer(1, 5))
            
            positive_points = []
            for point in data.get('positive_points', []):
                positive_points.append([Paragraph(f"• {point}", self.bullet_style)])
            
            if positive_points:
                points_table = Table(positive_points, colWidths=[15*cm])
                points_table.setStyle(TableStyle([
                    ('LEFTPADDING', (0, 0), (-1, -1), 10),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                    ('TOPPADDING', (0, 0), (-1, -1), 5),
                    ('BACKGROUND', (0, 0), (-1, -1), self.light_color),
                    ('BOX', (0, 0), (-1, -1), 0.5, self.accent_color),
                ]))
                story.append(points_table)

            story.append(Spacer(1, 15)) # Add space before improvement potential

            # Improvement potential in a styled box
            story.append(Paragraph("Potentiel d'Amélioration :", self.subheader_style)) # French label
            story.append(Spacer(1, 5))

            recommendations = []
            # Use 'Recommendations' key from the input data
            for point in data.get('recommendations', []): # Changed key here
                recommendations.append([Paragraph(f"• {point}", self.bullet_style)])

            if recommendations:
                improvement_table = Table(recommendations, colWidths=[15*cm]) # Use recommendations list
                improvement_table.setStyle(TableStyle([
                    ('LEFTPADDING', (0, 0), (-1, -1), 10),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                    ('TOPPADDING', (0, 0), (-1, -1), 5),
                    ('BACKGROUND', (0, 0), (-1, -1), self.light_color),
                    ('BOX', (0, 0), (-1, -1), 0.5, self.accent_color),
                ]))
                story.append(improvement_table)
            
            story.append(Spacer(1, 20)) # Keep spacer before conclusion
            
            # Conclusion with modern styling
            story.append(Paragraph("6. Conclusion", self.header_style))
            story.append(Spacer(1, 15))
            
            # Format conclusion for better readability
            conclusion_paragraphs = [
                f"Aucun élément n'a été détecté au cours de l'audit qui puisse remettre en cause les affirmations suivantes.",
                f"Les objectifs de l'audit ont été atteints.",
                f"L'auditeur a détecté {data.get('non_conformities_count', '0')} non-conformités dans plusieurs chapitres des référentiels.",
                f"La conformité aux exigences de la norme {data.get('reference_standard', 'ISO 9001:2015')} a été vérifiée et confirmée."
            ]
            
            for para in conclusion_paragraphs:
                story.append(Paragraph(para, self.normal_style))
                story.append(Spacer(1, 12))
            
            story.append(PageBreak())

            # Section 7: General Remarks with modern styling
            story.append(Paragraph("7. Remarques Générales", self.header_style))
            story.append(Spacer(1, 15))
            remarks_text = data["resume"]
            story.append(Paragraph(remarks_text, self.normal_style))
            story.append(Spacer(1, 24))
            story.append(Paragraph("Fin du rapport.", self.normal_style))

            # Build the PDF
            pdf_doc.build(story, onFirstPage=self.create_header_footer, onLaterPages=self.create_header_footer)
            return output_path

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Report generation error: {str(e)}")
