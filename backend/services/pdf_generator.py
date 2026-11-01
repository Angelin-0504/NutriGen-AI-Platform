import io
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

class NutriGenPDFGenerator:
    def __init__(self):
        self.styles = getSampleStyleSheet()
        
        # Define clean, curated color palette
        self.primary_color = colors.HexColor("#0f172a") # dark slate
        self.secondary_color = colors.HexColor("#0284c7") # blue
        self.accent_color = colors.HexColor("#f59e0b") # amber
        self.light_bg = colors.HexColor("#f8fafc") # slate 50
        
        # Set up custom styles
        self.title_style = ParagraphStyle(
            'TitleStyle',
            parent=self.styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=22,
            textColor=self.primary_color,
            alignment=TA_CENTER,
            spaceAfter=15
        )
        self.h2_style = ParagraphStyle(
            'H2Style',
            parent=self.styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=14,
            textColor=self.secondary_color,
            spaceBefore=10,
            spaceAfter=8
        )
        self.body_style = ParagraphStyle(
            'BodyStyle',
            parent=self.styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            textColor=colors.HexColor("#334155"),
            spaceBefore=4,
            spaceAfter=4,
            leading=14
        )
        self.disclaimer_style = ParagraphStyle(
            'DisclaimerStyle',
            parent=self.styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=8.5,
            textColor=colors.HexColor("#64748b"),
            spaceBefore=6,
            spaceAfter=6,
            leading=12
        )
        self.table_header_style = ParagraphStyle(
            'TableHeader',
            parent=self.styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9.5,
            textColor=colors.white,
            alignment=TA_LEFT
        )
        self.table_cell_style = ParagraphStyle(
            'TableCell',
            parent=self.styles['Normal'],
            fontName='Helvetica',
            fontSize=8.5,
            textColor=colors.HexColor("#1e293b"),
            leading=11
        )

    def generate_report(self, user_data: dict, deficiences: list, meal_plan: list, twin_scenarios: dict = None, family_data: dict = None, explanations: dict = None) -> io.BytesIO:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=40
        )
        
        story = []
        
        # 1. Main Header
        story.append(Paragraph("NUTRIGEN AI", self.title_style))
        story.append(Paragraph("Personalized Dietary Intelligence Report & Decision-Support System", ParagraphStyle('Subtitle', parent=self.styles['Normal'], fontName='Helvetica-Bold', fontSize=11, textColor=self.secondary_color, alignment=TA_CENTER, spaceAfter=20)))
        
        # 2. Medical Disclaimer Box
        disclaimer_text = (
            "<b>IMPORTANT HEALTHCARE DISCLAIMER:</b> NutriGen AI is an educational decision-support tool, "
            "not a medical diagnostic system. All projections, risk scores, and nutrient values are estimates. "
            "This report should not replace medical advice. If you suspect any laboratory deficiencies, please consult "
            "a qualified healthcare professional to arrange clinical testing."
        )
        disclaimer_table = Table([[Paragraph(disclaimer_text, self.disclaimer_style)]], colWidths=[530])
        disclaimer_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#fef2f2")), # light red bg
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#fca5a5")),
            ('PADDING', (0,0), (-1,-1), 10),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        story.append(disclaimer_table)
        story.append(Spacer(1, 15))
        
        # 3. User Demographic Summary
        story.append(Paragraph("User Risk Profile", self.h2_style))
        bmi_val = round(user_data['weight'] / ((user_data['height']/100)**2), 2)
        demo_data = [
            [Paragraph("<b>Name:</b> " + user_data['name'], self.body_style), Paragraph("<b>Age / Gender:</b> " + f"{user_data['age']} / {user_data['gender']}", self.body_style)],
            [Paragraph("<b>BMI:</b> " + f"{bmi_val} kg/m²", self.body_style), Paragraph("<b>Region:</b> " + user_data['region'], self.body_style)],
            [Paragraph("<b>Diet Type:</b> " + user_data['diet_type'], self.body_style), Paragraph("<b>Daily Budget:</b> INR " + f"{user_data['daily_food_budget']}", self.body_style)]
        ]
        demo_table = Table(demo_data, colWidths=[265, 265])
        demo_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), self.light_bg),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
            ('PADDING', (0,0), (-1,-1), 8),
            ('LINEBELOW', (0,0), (-1,-2), 0.5, colors.HexColor("#e2e8f0")),
        ]))
        story.append(demo_table)
        story.append(Spacer(1, 15))

        # 3b. Weight Management Section (if active)
        if user_data.get('wants_weight_loss'):
            story.append(Paragraph("Weight-Loss & Calorie Management Profile", self.h2_style))
            target_wt = user_data.get('target_weight', user_data.get('weight', 0))
            cal_tgt = user_data.get('calorie_target', 'Calibrated')
            tdee_val = user_data.get('tdee', 'Calculated')
            wl_rate = user_data.get('weight_loss_rate', 0.5)
            wl_data = [
                [Paragraph(f"<b>Current Weight:</b> {user_data.get('weight')} kg", self.body_style), Paragraph(f"<b>Target Weight:</b> {target_wt} kg", self.body_style)],
                [Paragraph(f"<b>Daily Calorie Target:</b> {cal_tgt} kcal/day", self.body_style), Paragraph(f"<b>Estimated TDEE:</b> {tdee_val} kcal/day", self.body_style)],
                [Paragraph(f"<b>Target Deficit Rate:</b> {wl_rate} kg/week", self.body_style), Paragraph("<b>Strategy:</b> Nutrient-Dense Deficit", self.body_style)]
            ]
            wl_table = Table(wl_data, colWidths=[265, 265])
            wl_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f0fdf4")),
                ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#86efac")),
                ('PADDING', (0,0), (-1,-1), 8),
                ('LINEBELOW', (0,0), (-1,-2), 0.5, colors.HexColor("#bbf7d0")),
            ]))
            story.append(wl_table)
            story.append(Spacer(1, 15))
        
        # 4. Nutrient Deficiencies Analysis (Sorted by risk)
        story.append(Paragraph("Nutrient Deficiency Risks & Rankings", self.h2_style))
        defic_data = [[
            Paragraph("Nutrient", self.table_header_style),
            Paragraph("Risk Prob.", self.table_header_style),
            Paragraph("Risk Status", self.table_header_style),
            Paragraph("Suggested Next Actions", self.table_header_style)
        ]]
        
        # Sort deficiencies by probability (highest to lowest)
        sorted_defic = sorted(deficiences, key=lambda x: x['probability'], reverse=True)
        
        for item in sorted_defic:
            prob_percent = f"{round(item['probability'] * 100)}%"
            # color coordinate risk cell
            status = item['risk_category']
            status_color = "#38bdf8" # low
            if status == "Very High":
                status_color = "#ef4444"
            elif status == "High":
                status_color = "#f97316"
            elif status == "Moderate":
                status_color = "#eab308"
                
            defic_data.append([
                Paragraph(f"<b>{item['nutrient']}</b>", self.table_cell_style),
                Paragraph(prob_percent, self.table_cell_style),
                Paragraph(f"<font color='{status_color}'><b>{status}</b></font>", self.table_cell_style),
                Paragraph(item['guidance'], self.table_cell_style)
            ])
            
        defic_table = Table(defic_data, colWidths=[110, 80, 80, 260])
        defic_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), self.primary_color),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
            ('PADDING', (0,0), (-1,-1), 6),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, self.light_bg]),
        ]))
        story.append(defic_table)
        story.append(Spacer(1, 15))

        # 4.5. SHAP-Based AI Risk Explanations (Nutrient-specific attributions)
        if explanations:
            story.append(Paragraph("AI Explainability - Why This Prediction? (SHAP Feature Attributions)", self.h2_style))
            exp_disclaimer = (
                "<b>SCIENTIFIC NOTICE:</b> SHAP values explain how input features influenced the model's prediction. "
                "They do not establish medical causation or confirm clinical diagnoses. Unprovided laboratory measurements "
                "(e.g. serum ferritin) were not collected in user profile."
            )
            exp_disc_table = Table([[Paragraph(exp_disclaimer, ParagraphStyle('ED', parent=self.body_style, fontSize=7.5, textColor=colors.HexColor("#1e293b")))]], colWidths=[530])
            exp_disc_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f1f5f9")),
                ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
                ('PADDING', (0,0), (-1,-1), 5),
            ]))
            story.append(exp_disc_table)
            story.append(Spacer(1, 6))

            exp_rows = [[
                Paragraph("Nutrient", self.table_header_style),
                Paragraph("Pred. Risk & Status", self.table_header_style),
                Paragraph("Influential Contributing Factors", self.table_header_style)
            ]]

            for k, exp in explanations.items():
                nut_name = exp.get("nutrient", k.replace("_deficiency", "").title())
                risk_pct = exp.get("predicted_risk_pct", 0)
                status = exp.get("risk_category", "Moderate predicted risk")
                reasons = exp.get("summary_reasons", [])
                reasons_text = "<br/>".join([f"• {r}" for r in reasons]) if reasons else "Baseline demographic profile contributed to model output."

                exp_rows.append([
                    Paragraph(f"<b>{nut_name}</b>", self.table_cell_style),
                    Paragraph(f"<b>{risk_pct}%</b><br/><font size='7' color='#475569'>{status}</font>", self.table_cell_style),
                    Paragraph(reasons_text, self.table_cell_style)
                ])

            exp_table = Table(exp_rows, colWidths=[100, 110, 320])
            exp_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), self.primary_color),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
                ('PADDING', (0,0), (-1,-1), 5),
                ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, self.light_bg]),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ]))
            story.append(exp_table)
            story.append(Spacer(1, 15))
        
        # 5. Nutrient Interactions Knowledge Base (Enhancers vs Inhibitors)
        story.append(Paragraph("Nutrient Absorption Intelligence", self.h2_style))
        absorp_rules = (
            "• <b>Non-Heme Iron Absorption:</b> Enhanced by Vitamin C (e.g. lemons, tomatoes). Inhibited by Tannins (tea/coffee) and Calcium. "
            "<i>Guidance: Squeeze lemon over spinach or dal, and avoid tea/coffee for 1 hour before/after meals.</i><br/>"
            "• <b>Calcium Uptake:</b> Requires Vitamin D to enable active transport in the small intestine.<br/>"
            "• <b>Zinc Absorption:</b> Enhanced by dietary proteins. Inhibited by Phytic acid present in unfermented grains."
        )
        story.append(Paragraph(absorp_rules, self.body_style))
        story.append(Spacer(1, 15))
        
        # 6. Weekly Meal Plan Table (All 7 days with ingredients, serving sizes, costs, and nutrition)
        story.append(Paragraph("Optimized 7-Day Meal Calendar & Nutrient Breakdown", self.h2_style))
        story.append(Paragraph("<i>Includes latest personalized ingredient swaps, serving portions, and daily target totals.</i>", ParagraphStyle('Sub', parent=self.styles['Normal'], fontSize=8, textColor=colors.HexColor("#64748b"), spaceAfter=6)))
        
        meal_data = [[
            Paragraph("Day", self.table_header_style),
            Paragraph("Breakfast", self.table_header_style),
            Paragraph("Lunch", self.table_header_style),
            Paragraph("Snacks", self.table_header_style),
            Paragraph("Dinner", self.table_header_style),
            Paragraph("Daily Nutrients & Cost", self.table_header_style)
        ]]
        
        for day_plan in meal_plan:
            meals = day_plan.get("meals", {})
            totals = day_plan.get("totals", {})
            cost_val = day_plan.get("cost", 0)
            
            # Extract detailed food texts with serving size if available
            def format_slot(slot_obj):
                if not slot_obj:
                    return "—"
                food_items = slot_obj.get("food_items", [])
                if food_items:
                    lines = []
                    for fi in food_items:
                        name = fi.get("name", "")
                        serving = fi.get("serving_size", "")
                        lines.append(f"• {name}" + (f" ({serving})" if serving and serving != "100g" else ""))
                    return "<br/>".join(lines)
                foods = slot_obj.get("foods", [])
                return "<br/>".join([f"• {f}" for f in foods]) if foods else "—"

            breakfast_foods = format_slot(meals.get("Breakfast"))
            lunch_foods = format_slot(meals.get("Lunch"))
            dinner_foods = format_slot(meals.get("Dinner"))
            
            mid_text = format_slot(meals.get("Mid-Morning Snack"))
            eve_text = format_slot(meals.get("Evening Snack"))
            snack_parts = []
            if mid_text and mid_text != "—":
                snack_parts.append(mid_text)
            if eve_text and eve_text != "—":
                snack_parts.append(eve_text)
            snack_foods = "<br/>".join(snack_parts) if snack_parts else "—"

            # Nutrient summary string for the day
            cal = totals.get("calories", "—")
            prot = totals.get("protein", "—")
            fe = totals.get("iron", "—")
            ca = totals.get("calcium", "—")
            vitd = totals.get("vitamin_d", "—")
            b12 = totals.get("vitamin_b12", "—")
            
            nut_summary = (
                f"<b>₹{cost_val}</b><br/>"
                f"<font size='7' color='#475569'>"
                f"{cal} kcal | {prot}g P<br/>"
                f"Fe: {fe}mg | Ca: {ca}mg<br/>"
                f"Vit D: {vitd}µg | B12: {b12}µg"
                f"</font>"
            )
            
            meal_data.append([
                Paragraph(f"<b>{day_plan.get('day', '')}</b>", self.table_cell_style),
                Paragraph(breakfast_foods, self.table_cell_style),
                Paragraph(lunch_foods, self.table_cell_style),
                Paragraph(snack_foods, self.table_cell_style),
                Paragraph(dinner_foods, self.table_cell_style),
                Paragraph(nut_summary, self.table_cell_style)
            ])
            
        meal_table = Table(meal_data, colWidths=[55, 105, 110, 105, 100, 75])
        meal_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), self.secondary_color),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
            ('PADDING', (0,0), (-1,-1), 4),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, self.light_bg]),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        story.append(meal_table)
        
        # 7. Digital Twin Simulation Section (Included ONLY if actually calculated)
        if twin_scenarios:
            story.append(Spacer(1, 15))
            story.append(Paragraph("Nutrition Digital Twin & Scenario Modeling", self.h2_style))
            
            twin_disclaimer = (
                "<b>AI-BASED NUTRITIONAL SCENARIO SIMULATION SUMMARY</b><br/>"
                "<i>Mathematical what-if projections based on adherence kinetics and nutrient bioavailability equations. "
                "These simulated trajectories represent computational scenarios and are NOT clinically validated predictions or guaranteed biological outcomes.</i>"
            )
            twin_disc_table = Table([[Paragraph(twin_disclaimer, ParagraphStyle('TD', parent=self.body_style, fontSize=8, textColor=colors.HexColor("#065f46")))]], colWidths=[530])
            twin_disc_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#ecfdf5")),
                ('BOX', (0,0), (-1,-1), 0.8, colors.HexColor("#a7f3d0")),
                ('PADDING', (0,0), (-1,-1), 6),
            ]))
            story.append(twin_disc_table)
            story.append(Spacer(1, 8))
            
            # Comparison of 4 scenarios table
            twin_headers = [
                Paragraph("Nutrient", self.table_header_style),
                Paragraph("Baseline Risk", self.table_header_style),
                Paragraph("S1: Current Diet", self.table_header_style),
                Paragraph("S2: Rec. Plan", self.table_header_style),
                Paragraph("S3: Low Adh.", self.table_header_style),
                Paragraph("S4: Alt. Strategy", self.table_header_style)
            ]
            twin_table_rows = [twin_headers]
            
            nutrient_wise = twin_scenarios.get("nutrient_wise_results", [])
            for nw in nutrient_wise:
                n_name = nw.get("nutrient_name", "")
                base_r = f"{nw.get('model_predicted_risk', '—')}%"
                
                # Extract final week simulated risks
                timeline = nw.get("timeline", [])
                final_point = timeline[-1] if timeline else {}
                
                s1_final = f"{final_point.get('current_pattern_risk', '—')}%"
                s2_final = f"{final_point.get('recommended_plan_risk', '—')}%"
                s3_final = f"{final_point.get('lower_adherence_risk', '—')}%"
                s4_final = f"{final_point.get('alternative_plan_risk', '—')}%"
                
                twin_table_rows.append([
                    Paragraph(f"<b>{n_name}</b>", self.table_cell_style),
                    Paragraph(base_r, self.table_cell_style),
                    Paragraph(s1_final, self.table_cell_style),
                    Paragraph(f"<font color='#059669'><b>{s2_final}</b></font>", self.table_cell_style),
                    Paragraph(s3_final, self.table_cell_style),
                    Paragraph(s4_final, self.table_cell_style),
                ])
                
            twin_table = Table(twin_table_rows, colWidths=[95, 85, 90, 90, 85, 85])
            twin_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f766e")),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
                ('PADDING', (0,0), (-1,-1), 4),
                ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, self.light_bg]),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ]))
            story.append(twin_table)
        
        # 8. Family Savings Box (Conditioned)
        if family_data:
            story.append(Spacer(1, 15))
            f_costs = family_data.get("costs", {})
            story.append(Paragraph("Family Shared Meal Optimization", self.h2_style))
            fam_text = (
                f"Individual Planning Cost: <b>₹{f_costs.get('individual_planning_cost')} / day</b><br/>"
                f"Optimized Family Shared Cost: <b>₹{f_costs.get('family_optimized_cost')} / day</b><br/>"
                f"Estimated Family Savings: <b>₹{f_costs.get('daily_savings')} / day (₹{f_costs.get('monthly_savings')} / month)</b><br/>"
                "<i>Optimized logic utilizes a common culinary baseline (e.g. Dosa/Rice base) and appends individual mineral portions only where required.</i>"
            )
            fam_table = Table([[Paragraph(fam_text, self.body_style)]], colWidths=[530])
            fam_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f0fdf4")), # light green bg
                ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#bbf7d0")),
                ('PADDING', (0,0), (-1,-1), 10),
            ]))
            story.append(fam_table)
            
        # Build Document
        doc.build(story)
        buffer.seek(0)
        return buffer

