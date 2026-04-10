"""
gen_daly_data.py — Generate JS data block for daly-anim.js from IHME CSV exports.

Usage:
    python gen_daly_data.py

Reads:
    ../../data/1990dalys.csv
    ../../data/2023dalys.csv

Outputs:
    JS const DATA = { 1990: {...}, 2023: {...} } block (prints to stdout).
    Paste it into daly-anim.js to replace the existing DATA const.

The L2→L3 hierarchy follows the GBD 2023 cause hierarchy exactly.
Causes in the CSV that are L4+ (sub-components of an L3 cause) are NOT included
directly — the L3 aggregate is used instead.
"""

import csv
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent.parent / "data"

# ── GBD L2 → L3 mapping ───────────────────────────────────────────────────────
# Each value is a list of (L3 cause name as in CSV, display label).
# Order determines sort priority within each group.
# An "Other [group]" entry is appended automatically for any residual.

L1_ORDER = [
    "Non-communicable diseases",
    "Communicable, maternal, neonatal, and nutritional diseases",
    "Injuries",
]

# L1 cause name → list of L2 cause names (order determines layout)
L1_TO_L2 = {
    "Non-communicable diseases": [
        "Cardiovascular diseases",
        "Neoplasms",
        "Mental disorders",
        "Musculoskeletal disorders",
        "Neurological disorders",
        "Diabetes and kidney diseases",
        "Chronic respiratory diseases",
        "Digestive diseases",
        "Other non-communicable diseases",
        "Sense organ diseases",
        "Substance use disorders",
        "Skin and subcutaneous diseases",
    ],
    "Communicable, maternal, neonatal, and nutritional diseases": [
        "Maternal and neonatal disorders",
        "Respiratory infections and tuberculosis",
        "Enteric infections",
        "Neglected tropical diseases and malaria",
        "Other infectious diseases",
        "Nutritional deficiencies",
        "HIV/AIDS and sexually transmitted infections",
    ],
    "Injuries": [
        "Unintentional injuries",
        "Transport injuries",
        "Self-harm and interpersonal violence",
    ],
}

# L2 → L3 child cause names (must be present in CSV as "Percent of total DALYs")
L2_TO_L3 = {
    # ── Non-communicable ──────────────────────────────────────────────────────
    "Cardiovascular diseases": [
        "Ischemic heart disease",
        "Stroke",
        "Hypertensive heart disease",
        "Cardiomyopathy and myocarditis",
        "Atrial fibrillation and flutter",
        "Rheumatic heart disease",
        "Non-rheumatic valvular heart disease",
        "Endocarditis",
        "Aortic aneurysm",
        "Lower extremity peripheral arterial disease",
        "Pulmonary Arterial Hypertension",
        "Other cardiovascular and circulatory diseases",
    ],
    "Neoplasms": [
        "Tracheal, bronchus, and lung cancer",
        "Colon and rectum cancer",
        "Breast cancer",
        "Stomach cancer",
        "Liver cancer",
        "Esophageal cancer",
        "Cervical cancer",
        "Pancreatic cancer",
        "Leukemia",
        "Brain and central nervous system cancer",
        "Non-Hodgkin lymphoma",
        "Prostate cancer",
        "Lip and oral cavity cancer",
        "Ovarian cancer",
        "Bladder cancer",
        "Uterine cancer",
        "Gallbladder and biliary tract cancer",
        "Nasopharynx cancer",
        "Larynx cancer",
        "Multiple myeloma",
        "Kidney cancer",
        "Malignant skin melanoma",
        "Other pharynx cancer",
        "Hodgkin lymphoma",
        "Thyroid cancer",
        "Mesothelioma",
        "Soft tissue and other extraosseous sarcomas",
        "Non-melanoma skin cancer",
        "Malignant neoplasm of bone and articular cartilage",
        "Myelodysplastic, myeloproliferative, and other hematopoietic neoplasms",
        "Other malignant neoplasms",
    ],
    "Mental disorders": [
        "Depressive disorders",
        "Anxiety disorders",
        "Bipolar disorder",
        "Schizophrenia",
        "Autism spectrum disorders",
        "Attention-deficit/hyperactivity disorder",
        "Conduct disorder",
        "Eating disorders",
        "Idiopathic developmental intellectual disability",
        "Other mental disorders",
    ],
    "Musculoskeletal disorders": [
        "Low back pain",
        "Neck pain",
        "Osteoarthritis",
        "Rheumatoid arthritis",
        "Gout",
        "Other musculoskeletal disorders",
    ],
    "Neurological disorders": [
        "Alzheimer's disease and other dementias",
        "Headache disorders",
        "Idiopathic epilepsy",
        "Parkinson's disease",
        "Multiple sclerosis",
        "Motor neuron disease",
        "Other neurological disorders",
    ],
    "Diabetes and kidney diseases": [
        "Diabetes mellitus",
        "Chronic kidney disease",
    ],
    "Chronic respiratory diseases": [
        "Chronic obstructive pulmonary disease",
        "Asthma",
        "Interstitial lung disease and pulmonary sarcoidosis",
        "Pneumoconiosis",
        "Other chronic respiratory diseases",
    ],
    "Digestive diseases": [
        "Cirrhosis and other chronic liver diseases",
        "Upper digestive system diseases",
        "Gallbladder and biliary diseases",
        "Pancreatitis",
        "Paralytic ileus and intestinal obstruction",
        "Inguinal, femoral, and abdominal hernia",
        "Appendicitis",
        "Inflammatory bowel disease",
        "Vascular intestinal disorders",
        "Other digestive diseases",
    ],
    "Other non-communicable diseases": [
        "Congenital birth defects",
        "Oral disorders",
        "Gynecological diseases",
        "Endocrine, metabolic, blood, and immune disorders",
        "Hemoglobinopathies and hemolytic anemias",
        "Urinary diseases and male infertility",
        "Sudden infant death syndrome",
    ],
    "Sense organ diseases": [
        "Blindness and vision loss",
        "Age-related and other hearing loss",
        "Other sense organ diseases",
    ],
    "Substance use disorders": [
        "Alcohol use disorders",
        "Drug use disorders",
    ],
    "Skin and subcutaneous diseases": [
        "Dermatitis",
        "Scabies",
        "Urticaria",
        "Psoriasis",
        "Bacterial skin diseases",
        "Fungal skin diseases",
        "Viral skin diseases",
        "Acne vulgaris",
        "Decubitus ulcer",
    ],
    # ── Communicable ─────────────────────────────────────────────────────────
    "Maternal and neonatal disorders": [
        "Neonatal disorders",
        "Maternal disorders",
    ],
    "Respiratory infections and tuberculosis": [
        "Lower respiratory infections",
        "COVID-19",
        "Tuberculosis",
        "Upper respiratory infections",
        "Otitis media",
    ],
    "Enteric infections": [
        "Diarrheal diseases",
        "Invasive Non-typhoidal Salmonella (iNTS)",
        "Typhoid and paratyphoid",
        "Other intestinal infectious diseases",
    ],
    "Neglected tropical diseases and malaria": [
        "Malaria",
        "Dengue",
        "Other neglected tropical diseases",
        "Intestinal nematode infections",
        "Schistosomiasis",
        "Lymphatic filariasis",
        "Leishmaniasis",
        "Cysticercosis",
        "Onchocerciasis",
        "Rabies",
        "Food-borne trematodiases",
        "African trypanosomiasis",
        "Yellow fever",
        "Trachoma",
        "Cystic echinococcosis",
        "Chagas disease",
    ],
    "Other infectious diseases": [
        "Meningitis",
        "Encephalitis",
        "Measles",
        "Pertussis",
        "Acute hepatitis",
        "Other unspecified infectious diseases",
        "Tetanus",
        "Diphtheria",
        "Varicella and herpes zoster",
        "Leprosy",
    ],
    "Nutritional deficiencies": [
        "Protein-energy malnutrition",
        "Dietary iron deficiency",
        "Iodine deficiency",
        "Vitamin A deficiency",
        "Other nutritional deficiencies",
    ],
    "HIV/AIDS and sexually transmitted infections": [
        "HIV/AIDS",
        "Sexually transmitted infections excluding HIV",
    ],
    # ── Injuries ──────────────────────────────────────────────────────────────
    "Unintentional injuries": [
        "Falls",
        "Drowning",
        "Exposure to mechanical forces",
        "Fire, heat, and hot substances",
        "Animal contact",
        "Foreign body",
        "Adverse effects of medical treatment",
        "Environmental heat and cold exposure",
        "Electrocution",
        "Poisonings",
        "Exposure to forces of nature",
        "Other unintentional injuries",
    ],
    "Transport injuries": [
        "Road injuries",
        "Other transport injuries",
    ],
    "Self-harm and interpersonal violence": [
        "Self-harm",
        "Interpersonal violence",
        "Conflict and terrorism",
        "Police conflict and executions",
    ],
}

# ── Short display labels (optional; used for small cells) ─────────────────────
SHORT = {
    "Ischemic heart disease":             "Ischaemic HD",
    "Hypertensive heart disease":         "Hypertensive HD",
    "Cardiomyopathy and myocarditis":     "Cardiomyopathy",
    "Atrial fibrillation and flutter":    "Afib",
    "Non-rheumatic valvular heart disease": "Valvular HD",
    "Aortic aneurysm":                    "Aortic aneurysm",
    "Lower extremity peripheral arterial disease": "PAD",
    "Pulmonary Arterial Hypertension":    "PAH",
    "Other cardiovascular and circulatory diseases": "Other CV",
    "Tracheal, bronchus, and lung cancer": "Lung cancer",
    "Colon and rectum cancer":            "Colorectal",
    "Brain and central nervous system cancer": "Brain cancer",
    "Non-Hodgkin lymphoma":               "NHL",
    "Lip and oral cavity cancer":         "Oral cancer",
    "Gallbladder and biliary tract cancer": "Gallbladder ca.",
    "Malignant skin melanoma":            "Melanoma",
    "Soft tissue and other extraosseous sarcomas": "Sarcomas",
    "Malignant neoplasm of bone and articular cartilage": "Bone cancer",
    "Myelodysplastic, myeloproliferative, and other hematopoietic neoplasms": "Myelo. neoplasms",
    "Other malignant neoplasms":          "Other malignant",
    "Depressive disorders":               "Depression",
    "Anxiety disorders":                  "Anxiety",
    "Autism spectrum disorders":          "Autism",
    "Attention-deficit/hyperactivity disorder": "ADHD",
    "Idiopathic developmental intellectual disability": "Intellect. disab.",
    "Alzheimer's disease and other dementias": "Dementia",
    "Idiopathic epilepsy":                "Epilepsy",
    "Parkinson's disease":                "Parkinson's",
    "Multiple sclerosis":                 "MS",
    "Motor neuron disease":               "MND",
    "Other neurological disorders":       "Other neuro.",
    "Headache disorders":                 "Headache",
    "Musculoskeletal disorders":          "Musculoskeletal",
    "Osteoarthritis":                     "OA",
    "Rheumatoid arthritis":               "RA",
    "Other musculoskeletal disorders":    "Other MSK",
    "Diabetes mellitus":                  "Diabetes",
    "Chronic kidney disease":             "CKD",
    "Urinary diseases and male infertility": "Urinary/GU",
    "Gynecological diseases":             "Gynecological",
    "Chronic obstructive pulmonary disease": "COPD",
    "Interstitial lung disease and pulmonary sarcoidosis": "ILD/sarcoidosis",
    "Other chronic respiratory diseases": "Other resp.",
    "Cirrhosis and other chronic liver diseases": "Cirrhosis",
    "Upper digestive system diseases":    "Upper GI",
    "Hemoglobinopathies and hemolytic anemias": "Hemoglobinopathies",
    "Inflammatory bowel disease":         "IBD",
    "Other digestive diseases":           "Other GI",
    "Congenital birth defects":           "Congenital",
    "Endocrine, metabolic, blood, and immune disorders": "Endocrine/metabolic",
    "Sudden infant death syndrome":       "SIDS",
    "Other non-communicable diseases":    "Other NCD",
    "Blindness and vision loss":          "Blindness/vision",
    "Age-related and other hearing loss": "Hearing loss",
    "Other sense organ diseases":         "Other sense",
    "Alcohol use disorders":              "Alcohol",
    "Dermatitis":                         "Dermatitis",
    "Bacterial skin diseases":            "Bacterial skin",
    "Fungal skin diseases":               "Fungal skin",
    "Viral skin diseases":                "Viral skin",
    "Other skin and subcutaneous diseases": "Other skin",
    "Neonatal disorders":                 "Neonatal",
    "Maternal disorders":                 "Maternal",
    "Lower respiratory infections":       "Lower resp. inf.",
    "Upper respiratory infections":       "Upper resp. inf.",
    "Invasive Non-typhoidal Salmonella (iNTS)": "iNTS",
    "Typhoid and paratyphoid":            "Typhoid",
    "Other intestinal infectious diseases": "Other intestinal",
    "Other neglected tropical diseases":  "Other NTDs",
    "Intestinal nematode infections":     "Nematodes",
    "Lymphatic filariasis":               "Filariasis",
    "Cysticercosis":                      "Cysticercosis",
    "Food-borne trematodiases":           "Trematodiases",
    "African trypanosomiasis":            "Trypanosomiasis",
    "Cystic echinococcosis":              "Echinococcosis",
    "Other unspecified infectious diseases": "Other infectious",
    "Varicella and herpes zoster":        "Varicella/HZ",
    "Protein-energy malnutrition":        "PEM",
    "Dietary iron deficiency":            "Iron deficiency",
    "Sexually transmitted infections excluding HIV": "STIs (non-HIV)",
    "Exposure to mechanical forces":      "Mech. forces",
    "Fire, heat, and hot substances":     "Fire/heat",
    "Adverse effects of medical treatment": "Med. adverse effects",
    "Environmental heat and cold exposure": "Heat/cold",
    "Exposure to forces of nature":       "Natural forces",
    "Other unintentional injuries":       "Other uninten.",
    "Other transport injuries":           "Other transport",
    "Interpersonal violence":             "Violence",
    "Conflict and terrorism":             "Conflict",
    "Police conflict and executions":     "Police/exec.",
}


def load_csv(path):
    """Return dict of {cause_name: fraction} for Percent of total DALYs rows."""
    values = {}
    with open(path, encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        next(reader)  # header
        for row in reader:
            if len(row) != 10:
                continue
            # Year column: use exact year string (e.g. '1990' or '2023')
            if row[6] == "Percent of total DALYs":
                try:
                    values[row[5]] = float(row[7])
                except ValueError:
                    pass
    return values


def build_hierarchy(vals, l1_order, l1_to_l2, l2_to_l3):
    hierarchy = {"name": "All causes", "children": []}
    for l1_name in l1_order:
        l1_node = {"name": l1_name, "children": []}
        for l2_name in l1_to_l2[l1_name]:
            l2_total = vals.get(l2_name, 0.0)
            l3_names = l2_to_l3.get(l2_name, [])
            l3_nodes = []
            assigned = 0.0
            for l3_name in l3_names:
                v = vals.get(l3_name, 0.0)
                if v > 0:
                    l3_nodes.append({"name": l3_name, "value": v})
                    assigned += v
            residual = l2_total - assigned
            if residual > 1e-6:
                # Avoid "Other other infectious diseases" style names
                if l2_name.lower().startswith("other "):
                    residual_label = l2_name  # keep as-is; already "Other X"
                else:
                    residual_label = f"Other {l2_name.lower()}"
                l3_nodes.append({"name": residual_label, "value": residual})
            l1_node["children"].append({"name": l2_name, "children": l3_nodes})
        hierarchy["children"].append(l1_node)
    return hierarchy


def fmt_node(node, indent=0):
    pad = "  " * indent
    if "children" in node:
        children_str = ",\n".join(fmt_node(c, indent + 1) for c in node["children"])
        return f'{pad}{{ name: {json_str(node["name"])}, children: [\n{children_str}\n{pad}] }}'
    else:
        return f'{pad}{{ name: {json_str(node["name"])}, value: {node["value"]:.6f} }}'


def json_str(s):
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def main():
    vals_1990 = load_csv(DATA_DIR / "1990dalys.csv")
    vals_2023 = load_csv(DATA_DIR / "2023dalys.csv")

    h1990 = build_hierarchy(vals_1990, L1_ORDER, L1_TO_L2, L2_TO_L3)
    h2023 = build_hierarchy(vals_2023, L1_ORDER, L1_TO_L2, L2_TO_L3)

    print("const DATA = {")
    print(f"  1990: {fmt_node(h1990, 1)},")
    print(f"  2023: {fmt_node(h2023, 1)},")
    print("};")

    # Validation: print residuals > 0.5% so they can be spotted
    print("\n// -- Validation (residuals > 0.5% of global DALYs) --")
    for year, vals in [("1990", vals_1990), ("2023", vals_2023)]:
        h = build_hierarchy(vals, L1_ORDER, L1_TO_L2, L2_TO_L3)
        for l1 in h["children"]:
            for l2 in l1["children"]:
                for leaf in l2["children"]:
                    if leaf["name"].startswith("Other ") and leaf["value"] > 0.005:
                        print(f"// {year} {l2['name']}: residual={leaf['value']:.4f} — consider adding more L3 causes")


if __name__ == "__main__":
    main()
