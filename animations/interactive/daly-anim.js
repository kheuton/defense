import * as d3 from "d3";

// ── Colour palette (keyed by L2 parent name) ──────────────────────────────────

const L2_COLORS = {
  // Non-communicable — purple family
  "Cardiovascular diseases":              "#3d35a5",
  "Neoplasms":                            "#5248c8",
  "Mental disorders":                     "#7c6af7",
  "Musculoskeletal disorders":            "#6459da",
  "Other non-communicable diseases":      "#4840b8",
  "Diabetes and kidney diseases":         "#8a7cf9",
  "Neurological disorders":               "#9a8ffb",
  "Chronic respiratory diseases":         "#a9a0fc",
  "Digestive diseases":                   "#5c52cc",
  "Sense organ diseases":                 "#b8b2fd",
  "Skin and subcutaneous diseases":       "#cac6fe",
  "Substance use disorders":              "#d8d5ff",

  // Communicable — coral family
  "Maternal and neonatal disorders":                            "#b83a1e",
  "Respiratory infections and tuberculosis":                    "#d44e2e",
  "Enteric infections":                                         "#ff7c57",
  "Other infectious diseases":                                  "#a83318",
  "Neglected tropical diseases and malaria":                    "#ff9a7a",
  "Nutritional deficiencies":                                   "#c95a38",
  "HIV/AIDS and sexually transmitted infections":               "#ffb8a4",

  // Injuries — teal family
  "Unintentional injuries":               "#236e56",
  "Transport injuries":                   "#50c8a8",
  "Self-harm and interpersonal violence": "#349e80",
};

// Short labels for medium-sized cells
const SHORT = {
  "Ischemic heart disease":             "Ischaemic HD",
  "Hypertensive heart disease":         "Hypertensive HD",
  "Cardiomyopathy and myocarditis":     "Cardiomyopathy",
  "Atrial fibrillation and flutter":    "A-fib",
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
  "Myelodysplastic, myeloproliferative, and other hematopoietic neoplasms": "Myelo. neo.",
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
  "Gallbladder and biliary diseases":   "Gallbladder",
  "Paralytic ileus and intestinal obstruction": "Ileus/obstruction",
  "Inguinal, femoral, and abdominal hernia": "Hernia",
  "Inflammatory bowel disease":         "IBD",
  "Vascular intestinal disorders":      "Vasc. intestinal",
  "Other digestive diseases":           "Other GI",
  "Congenital birth defects":           "Congenital",
  "Endocrine, metabolic, blood, and immune disorders": "Endocrine/metab.",
  "Hemoglobinopathies and hemolytic anemias": "Hemoglobinopathies",
  "Sudden infant death syndrome":       "SIDS",
  "Blindness and vision loss":          "Blindness/vision",
  "Age-related and other hearing loss": "Hearing loss",
  "Other sense organ diseases":         "Other sense",
  "Alcohol use disorders":              "Alcohol",
  "Drug use disorders":                 "Drug use",
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
  "Adverse effects of medical treatment": "Med. adv. effects",
  "Environmental heat and cold exposure": "Heat/cold",
  "Exposure to forces of nature":       "Natural forces",
  "Other unintentional injuries":       "Other uninten.",
  "Other transport injuries":           "Other transport",
  "Interpersonal violence":             "Violence",
  "Conflict and terrorism":             "Conflict",
  "Police conflict and executions":     "Police/exec.",
};

// ── Hierarchy data (generated by gen_daly_data.py from IHME GBD CSVs) ─────────

const DATA = {
  1990: { name: "All causes", children: [
    { name: "Non-communicable diseases", children: [
      { name: "Cardiovascular diseases", children: [
        { name: "Ischemic heart disease", value: 0.046363 },
        { name: "Stroke", value: 0.048535 },
        { name: "Hypertensive heart disease", value: 0.005710 },
        { name: "Cardiomyopathy and myocarditis", value: 0.003298 },
        { name: "Atrial fibrillation and flutter", value: 0.001248 },
        { name: "Rheumatic heart disease", value: 0.006919 },
        { name: "Non-rheumatic valvular heart disease", value: 0.000599 },
        { name: "Endocarditis", value: 0.000549 },
        { name: "Aortic aneurysm", value: 0.000701 },
        { name: "Lower extremity peripheral arterial disease", value: 0.000354 },
        { name: "Pulmonary Arterial Hypertension", value: 0.000321 },
        { name: "Other cardiovascular and circulatory diseases", value: 0.002240 }
      ] },
      { name: "Neoplasms", children: [
        { name: "Tracheal, bronchus, and lung cancer", value: 0.010520 },
        { name: "Colon and rectum cancer", value: 0.005414 },
        { name: "Breast cancer", value: 0.004313 },
        { name: "Stomach cancer", value: 0.009022 },
        { name: "Liver cancer", value: 0.002876 },
        { name: "Esophageal cancer", value: 0.003748 },
        { name: "Cervical cancer", value: 0.002835 },
        { name: "Pancreatic cancer", value: 0.001983 },
        { name: "Leukemia", value: 0.004788 },
        { name: "Brain and central nervous system cancer", value: 0.002349 },
        { name: "Non-Hodgkin lymphoma", value: 0.001911 },
        { name: "Prostate cancer", value: 0.001550 },
        { name: "Lip and oral cavity cancer", value: 0.001084 },
        { name: "Ovarian cancer", value: 0.001155 },
        { name: "Bladder cancer", value: 0.001002 },
        { name: "Uterine cancer", value: 0.000597 },
        { name: "Gallbladder and biliary tract cancer", value: 0.000873 },
        { name: "Nasopharynx cancer", value: 0.000843 },
        { name: "Larynx cancer", value: 0.000851 },
        { name: "Multiple myeloma", value: 0.000425 },
        { name: "Kidney cancer", value: 0.000851 },
        { name: "Malignant skin melanoma", value: 0.000379 },
        { name: "Other pharynx cancer", value: 0.000496 },
        { name: "Hodgkin lymphoma", value: 0.000512 },
        { name: "Thyroid cancer", value: 0.000269 },
        { name: "Mesothelioma", value: 0.000126 },
        { name: "Soft tissue and other extraosseous sarcomas", value: 0.000512 },
        { name: "Non-melanoma skin cancer", value: 0.000209 },
        { name: "Malignant neoplasm of bone and articular cartilage", value: 0.000691 },
        { name: "Myelodysplastic, myeloproliferative, and other hematopoietic neoplasms", value: 0.000151 },
        { name: "Other malignant neoplasms", value: 0.002139 },
        { name: "Other neoplasms", value: 0.000954 }
      ] },
      { name: "Mental disorders", children: [
        { name: "Depressive disorders", value: 0.009209 },
        { name: "Anxiety disorders", value: 0.007861 },
        { name: "Bipolar disorder", value: 0.001657 },
        { name: "Schizophrenia", value: 0.003476 },
        { name: "Autism spectrum disorders", value: 0.002071 },
        { name: "Attention-deficit/hyperactivity disorder", value: 0.001034 },
        { name: "Conduct disorder", value: 0.001365 },
        { name: "Eating disorders", value: 0.000816 },
        { name: "Idiopathic developmental intellectual disability", value: 0.001045 },
        { name: "Other mental disorders", value: 0.001891 }
      ] },
      { name: "Musculoskeletal disorders", children: [
        { name: "Low back pain", value: 0.015722 },
        { name: "Neck pain", value: 0.004148 },
        { name: "Osteoarthritis", value: 0.003247 },
        { name: "Rheumatoid arthritis", value: 0.000599 },
        { name: "Gout", value: 0.000252 },
        { name: "Other musculoskeletal disorders", value: 0.007430 }
      ] },
      { name: "Neurological disorders", children: [
        { name: "Alzheimer's disease and other dementias", value: 0.004915 },
        { name: "Headache disorders", value: 0.010033 },
        { name: "Idiopathic epilepsy", value: 0.004454 },
        { name: "Parkinson's disease", value: 0.001002 },
        { name: "Multiple sclerosis", value: 0.000211 },
        { name: "Motor neuron disease", value: 0.000203 },
        { name: "Other neurological disorders", value: 0.000479 }
      ] },
      { name: "Diabetes and kidney diseases", children: [
        { name: "Diabetes mellitus", value: 0.011396 },
        { name: "Chronic kidney disease", value: 0.008218 },
        { name: "Other diabetes and kidney diseases", value: 0.000276 }
      ] },
      { name: "Chronic respiratory diseases", children: [
        { name: "Chronic obstructive pulmonary disease", value: 0.016162 },
        { name: "Asthma", value: 0.006743 },
        { name: "Interstitial lung disease and pulmonary sarcoidosis", value: 0.000477 },
        { name: "Pneumoconiosis", value: 0.000139 },
        { name: "Other chronic respiratory diseases", value: 0.001147 }
      ] },
      { name: "Digestive diseases", children: [
        { name: "Cirrhosis and other chronic liver diseases", value: 0.013233 },
        { name: "Upper digestive system diseases", value: 0.005453 },
        { name: "Gallbladder and biliary diseases", value: 0.001732 },
        { name: "Pancreatitis", value: 0.001025 },
        { name: "Paralytic ileus and intestinal obstruction", value: 0.002717 },
        { name: "Inguinal, femoral, and abdominal hernia", value: 0.000815 },
        { name: "Appendicitis", value: 0.000664 },
        { name: "Inflammatory bowel disease", value: 0.000352 },
        { name: "Vascular intestinal disorders", value: 0.000413 },
        { name: "Other digestive diseases", value: 0.000989 }
      ] },
      { name: "Other non-communicable diseases", children: [
        { name: "Congenital birth defects", value: 0.024854 },
        { name: "Oral disorders", value: 0.004657 },
        { name: "Gynecological diseases", value: 0.006299 },
        { name: "Endocrine, metabolic, blood, and immune disorders", value: 0.003208 },
        { name: "Hemoglobinopathies and hemolytic anemias", value: 0.004676 },
        { name: "Urinary diseases and male infertility", value: 0.002148 },
        { name: "Sudden infant death syndrome", value: 0.002571 }
      ] },
      { name: "Sense organ diseases", children: [
        { name: "Blindness and vision loss", value: 0.004679 },
        { name: "Age-related and other hearing loss", value: 0.009073 },
        { name: "Other sense organ diseases", value: 0.000536 }
      ] },
      { name: "Substance use disorders", children: [
        { name: "Alcohol use disorders", value: 0.004852 },
        { name: "Drug use disorders", value: 0.003323 }
      ] },
      { name: "Skin and subcutaneous diseases", children: [
        { name: "Dermatitis", value: 0.004173 },
        { name: "Scabies", value: 0.000814 },
        { name: "Urticaria", value: 0.001349 },
        { name: "Psoriasis", value: 0.000442 },
        { name: "Bacterial skin diseases", value: 0.000454 },
        { name: "Fungal skin diseases", value: 0.000550 },
        { name: "Viral skin diseases", value: 0.000439 },
        { name: "Acne vulgaris", value: 0.000200 },
        { name: "Decubitus ulcer", value: 0.000162 },
        { name: "Other skin and subcutaneous diseases", value: 0.000330 }
      ] }
    ] },
    { name: "Communicable, maternal, neonatal, and nutritional diseases", children: [
      { name: "Maternal and neonatal disorders", children: [
        { name: "Neonatal disorders", value: 0.107662 },
        { name: "Maternal disorders", value: 0.009918 }
      ] },
      { name: "Respiratory infections and tuberculosis", children: [
        { name: "Lower respiratory infections", value: 0.073903 },
        { name: "Tuberculosis", value: 0.031728 },
        { name: "Upper respiratory infections", value: 0.002266 },
        { name: "Otitis media", value: 0.000767 }
      ] },
      { name: "Enteric infections", children: [
        { name: "Diarrheal diseases", value: 0.079554 },
        { name: "Invasive Non-typhoidal Salmonella (iNTS)", value: 0.001802 },
        { name: "Typhoid and paratyphoid", value: 0.009492 },
        { name: "Other intestinal infectious diseases", value: 0.000036 }
      ] },
      { name: "Neglected tropical diseases and malaria", children: [
        { name: "Malaria", value: 0.023649 },
        { name: "Dengue", value: 0.000508 },
        { name: "Other neglected tropical diseases", value: 0.001581 },
        { name: "Intestinal nematode infections", value: 0.002669 },
        { name: "Schistosomiasis", value: 0.000773 },
        { name: "Lymphatic filariasis", value: 0.001405 },
        { name: "Leishmaniasis", value: 0.002270 },
        { name: "Cysticercosis", value: 0.000406 },
        { name: "Onchocerciasis", value: 0.000500 },
        { name: "Rabies", value: 0.000764 },
        { name: "Food-borne trematodiases", value: 0.000457 },
        { name: "African trypanosomiasis", value: 0.000545 },
        { name: "Yellow fever", value: 0.000487 },
        { name: "Trachoma", value: 0.000084 },
        { name: "Cystic echinococcosis", value: 0.000119 },
        { name: "Chagas disease", value: 0.000182 },
        { name: "Other neglected tropical diseases and malaria", value: 0.000019 }
      ] },
      { name: "Other infectious diseases", children: [
        { name: "Meningitis", value: 0.013352 },
        { name: "Encephalitis", value: 0.002085 },
        { name: "Measles", value: 0.034936 },
        { name: "Pertussis", value: 0.009017 },
        { name: "Acute hepatitis", value: 0.004753 },
        { name: "Other unspecified infectious diseases", value: 0.002375 },
        { name: "Tetanus", value: 0.008642 },
        { name: "Diphtheria", value: 0.001267 },
        { name: "Varicella and herpes zoster", value: 0.000409 },
        { name: "Leprosy", value: 0.000010 }
      ] },
      { name: "Nutritional deficiencies", children: [
        { name: "Protein-energy malnutrition", value: 0.014796 },
        { name: "Dietary iron deficiency", value: 0.012998 },
        { name: "Iodine deficiency", value: 0.000892 },
        { name: "Vitamin A deficiency", value: 0.000768 },
        { name: "Other nutritional deficiencies", value: 0.001316 }
      ] },
      { name: "HIV/AIDS and sexually transmitted infections", children: [
        { name: "HIV/AIDS", value: 0.007806 },
        { name: "Sexually transmitted infections excluding HIV", value: 0.002938 }
      ] }
    ] },
    { name: "Injuries", children: [
      { name: "Unintentional injuries", children: [
        { name: "Falls", value: 0.016430 },
        { name: "Drowning", value: 0.013192 },
        { name: "Exposure to mechanical forces", value: 0.004540 },
        { name: "Fire, heat, and hot substances", value: 0.003641 },
        { name: "Animal contact", value: 0.002519 },
        { name: "Foreign body", value: 0.002687 },
        { name: "Adverse effects of medical treatment", value: 0.001773 },
        { name: "Environmental heat and cold exposure", value: 0.000937 },
        { name: "Electrocution", value: 0.001388 },
        { name: "Poisonings", value: 0.001770 },
        { name: "Exposure to forces of nature", value: 0.001286 },
        { name: "Other unintentional injuries", value: 0.005864 }
      ] },
      { name: "Transport injuries", children: [
        { name: "Road injuries", value: 0.027328 },
        { name: "Other transport injuries", value: 0.001692 }
      ] },
      { name: "Self-harm and interpersonal violence", children: [
        { name: "Self-harm", value: 0.012257 },
        { name: "Interpersonal violence", value: 0.010395 },
        { name: "Conflict and terrorism", value: 0.003128 },
        { name: "Police conflict and executions", value: 0.000155 }
      ] }
    ] }
  ] },
  2023: { name: "All causes", children: [
    { name: "Non-communicable diseases", children: [
      { name: "Cardiovascular diseases", children: [
        { name: "Ischemic heart disease", value: 0.068866 },
        { name: "Stroke", value: 0.055975 },
        { name: "Hypertensive heart disease", value: 0.010167 },
        { name: "Cardiomyopathy and myocarditis", value: 0.004292 },
        { name: "Atrial fibrillation and flutter", value: 0.003308 },
        { name: "Rheumatic heart disease", value: 0.005173 },
        { name: "Non-rheumatic valvular heart disease", value: 0.001226 },
        { name: "Endocarditis", value: 0.000836 },
        { name: "Aortic aneurysm", value: 0.001224 },
        { name: "Lower extremity peripheral arterial disease", value: 0.000665 },
        { name: "Pulmonary Arterial Hypertension", value: 0.000251 },
        { name: "Other cardiovascular and circulatory diseases", value: 0.004124 }
      ] },
      { name: "Neoplasms", children: [
        { name: "Tracheal, bronchus, and lung cancer", value: 0.016702 },
        { name: "Colon and rectum cancer", value: 0.009364 },
        { name: "Breast cancer", value: 0.008809 },
        { name: "Stomach cancer", value: 0.008051 },
        { name: "Liver cancer", value: 0.004985 },
        { name: "Esophageal cancer", value: 0.005024 },
        { name: "Cervical cancer", value: 0.004746 },
        { name: "Pancreatic cancer", value: 0.004396 },
        { name: "Leukemia", value: 0.004362 },
        { name: "Brain and central nervous system cancer", value: 0.003281 },
        { name: "Non-Hodgkin lymphoma", value: 0.002976 },
        { name: "Prostate cancer", value: 0.003188 },
        { name: "Lip and oral cavity cancer", value: 0.002309 },
        { name: "Ovarian cancer", value: 0.002319 },
        { name: "Bladder cancer", value: 0.001656 },
        { name: "Uterine cancer", value: 0.001038 },
        { name: "Gallbladder and biliary tract cancer", value: 0.001433 },
        { name: "Nasopharynx cancer", value: 0.000925 },
        { name: "Larynx cancer", value: 0.001275 },
        { name: "Multiple myeloma", value: 0.001007 },
        { name: "Kidney cancer", value: 0.001454 },
        { name: "Malignant skin melanoma", value: 0.000653 },
        { name: "Other pharynx cancer", value: 0.001192 },
        { name: "Hodgkin lymphoma", value: 0.000424 },
        { name: "Thyroid cancer", value: 0.000558 },
        { name: "Mesothelioma", value: 0.000224 },
        { name: "Soft tissue and other extraosseous sarcomas", value: 0.000796 },
        { name: "Non-melanoma skin cancer", value: 0.000477 },
        { name: "Malignant neoplasm of bone and articular cartilage", value: 0.001082 },
        { name: "Myelodysplastic, myeloproliferative, and other hematopoietic neoplasms", value: 0.000437 },
        { name: "Other malignant neoplasms", value: 0.002394 },
        { name: "Other neoplasms", value: 0.001267 }
      ] },
      { name: "Mental disorders", children: [
        { name: "Depressive disorders", value: 0.019924 },
        { name: "Anxiety disorders", value: 0.019709 },
        { name: "Bipolar disorder", value: 0.002717 },
        { name: "Schizophrenia", value: 0.006059 },
        { name: "Autism spectrum disorders", value: 0.003522 },
        { name: "Attention-deficit/hyperactivity disorder", value: 0.001325 },
        { name: "Conduct disorder", value: 0.001710 },
        { name: "Eating disorders", value: 0.001360 },
        { name: "Idiopathic developmental intellectual disability", value: 0.001295 },
        { name: "Other mental disorders", value: 0.003363 }
      ] },
      { name: "Musculoskeletal disorders", children: [
        { name: "Low back pain", value: 0.025052 },
        { name: "Neck pain", value: 0.007362 },
        { name: "Osteoarthritis", value: 0.007917 },
        { name: "Rheumatoid arthritis", value: 0.001190 },
        { name: "Gout", value: 0.000637 },
        { name: "Other musculoskeletal disorders", value: 0.016186 }
      ] },
      { name: "Neurological disorders", children: [
        { name: "Alzheimer's disease and other dementias", value: 0.014219 },
        { name: "Headache disorders", value: 0.016204 },
        { name: "Idiopathic epilepsy", value: 0.005506 },
        { name: "Parkinson's disease", value: 0.002853 },
        { name: "Multiple sclerosis", value: 0.000382 },
        { name: "Motor neuron disease", value: 0.000436 },
        { name: "Other neurological disorders", value: 0.002102 }
      ] },
      { name: "Diabetes and kidney diseases", children: [
        { name: "Diabetes mellitus", value: 0.032175 },
        { name: "Chronic kidney disease", value: 0.016509 },
        { name: "Other diabetes and kidney diseases", value: 0.000117 }
      ] },
      { name: "Chronic respiratory diseases", children: [
        { name: "Chronic obstructive pulmonary disease", value: 0.026786 },
        { name: "Asthma", value: 0.009219 },
        { name: "Interstitial lung disease and pulmonary sarcoidosis", value: 0.001596 },
        { name: "Pneumoconiosis", value: 0.000190 },
        { name: "Other chronic respiratory diseases", value: 0.001304 }
      ] },
      { name: "Digestive diseases", children: [
        { name: "Cirrhosis and other chronic liver diseases", value: 0.015347 },
        { name: "Upper digestive system diseases", value: 0.005472 },
        { name: "Gallbladder and biliary diseases", value: 0.002911 },
        { name: "Pancreatitis", value: 0.001504 },
        { name: "Paralytic ileus and intestinal obstruction", value: 0.002576 },
        { name: "Inguinal, femoral, and abdominal hernia", value: 0.000858 },
        { name: "Appendicitis", value: 0.000521 },
        { name: "Inflammatory bowel disease", value: 0.000579 },
        { name: "Vascular intestinal disorders", value: 0.000616 },
        { name: "Other digestive diseases", value: 0.001264 }
      ] },
      { name: "Other non-communicable diseases", children: [
        { name: "Congenital birth defects", value: 0.019584 },
        { name: "Oral disorders", value: 0.008511 },
        { name: "Gynecological diseases", value: 0.010358 },
        { name: "Endocrine, metabolic, blood, and immune disorders", value: 0.005178 },
        { name: "Hemoglobinopathies and hemolytic anemias", value: 0.005278 },
        { name: "Urinary diseases and male infertility", value: 0.004276 },
        { name: "Sudden infant death syndrome", value: 0.000821 }
      ] },
      { name: "Sense organ diseases", children: [
        { name: "Blindness and vision loss", value: 0.008395 },
        { name: "Age-related and other hearing loss", value: 0.018881 },
        { name: "Other sense organ diseases", value: 0.001069 }
      ] },
      { name: "Substance use disorders", children: [
        { name: "Alcohol use disorders", value: 0.006430 },
        { name: "Drug use disorders", value: 0.006280 }
      ] },
      { name: "Skin and subcutaneous diseases", children: [
        { name: "Dermatitis", value: 0.005384 },
        { name: "Scabies", value: 0.001136 },
        { name: "Urticaria", value: 0.001788 },
        { name: "Psoriasis", value: 0.000943 },
        { name: "Bacterial skin diseases", value: 0.001045 },
        { name: "Fungal skin diseases", value: 0.000707 },
        { name: "Viral skin diseases", value: 0.000644 },
        { name: "Acne vulgaris", value: 0.000417 },
        { name: "Decubitus ulcer", value: 0.000395 },
        { name: "Other skin and subcutaneous diseases", value: 0.000569 }
      ] }
    ] },
    { name: "Communicable, maternal, neonatal, and nutritional diseases", children: [
      { name: "Maternal and neonatal disorders", children: [
        { name: "Neonatal disorders", value: 0.060833 },
        { name: "Maternal disorders", value: 0.005573 }
      ] },
      { name: "Respiratory infections and tuberculosis", children: [
        { name: "Lower respiratory infections", value: 0.035343 },
        { name: "COVID-19", value: 0.011477 },
        { name: "Tuberculosis", value: 0.015609 },
        { name: "Upper respiratory infections", value: 0.002232 },
        { name: "Otitis media", value: 0.000890 }
      ] },
      { name: "Enteric infections", children: [
        { name: "Diarrheal diseases", value: 0.020204 },
        { name: "Invasive Non-typhoidal Salmonella (iNTS)", value: 0.002093 },
        { name: "Typhoid and paratyphoid", value: 0.002226 },
        { name: "Other intestinal infectious diseases", value: 0.000034 }
      ] },
      { name: "Neglected tropical diseases and malaria", children: [
        { name: "Malaria", value: 0.018494 },
        { name: "Dengue", value: 0.001079 },
        { name: "Other neglected tropical diseases", value: 0.001830 },
        { name: "Intestinal nematode infections", value: 0.000548 },
        { name: "Schistosomiasis", value: 0.000738 },
        { name: "Lymphatic filariasis", value: 0.000530 },
        { name: "Leishmaniasis", value: 0.000387 },
        { name: "Cysticercosis", value: 0.000422 },
        { name: "Onchocerciasis", value: 0.000310 },
        { name: "Rabies", value: 0.000311 },
        { name: "Food-borne trematodiases", value: 0.000368 },
        { name: "African trypanosomiasis", value: 0.000030 },
        { name: "Yellow fever", value: 0.000111 },
        { name: "Trachoma", value: 0.000052 },
        { name: "Cystic echinococcosis", value: 0.000035 },
        { name: "Chagas disease", value: 0.000102 },
        { name: "Other neglected tropical diseases and malaria", value: 0.000007 }
      ] },
      { name: "Other infectious diseases", children: [
        { name: "Meningitis", value: 0.006254 },
        { name: "Encephalitis", value: 0.001530 },
        { name: "Measles", value: 0.004463 },
        { name: "Pertussis", value: 0.003629 },
        { name: "Acute hepatitis", value: 0.001988 },
        { name: "Other unspecified infectious diseases", value: 0.003306 },
        { name: "Tetanus", value: 0.000445 },
        { name: "Diphtheria", value: 0.000118 },
        { name: "Varicella and herpes zoster", value: 0.000296 },
        { name: "Leprosy", value: 0.000007 }
      ] },
      { name: "Nutritional deficiencies", children: [
        { name: "Protein-energy malnutrition", value: 0.005029 },
        { name: "Dietary iron deficiency", value: 0.013960 },
        { name: "Iodine deficiency", value: 0.000798 },
        { name: "Vitamin A deficiency", value: 0.000383 },
        { name: "Other nutritional deficiencies", value: 0.000603 }
      ] },
      { name: "HIV/AIDS and sexually transmitted infections", children: [
        { name: "HIV/AIDS", value: 0.016143 },
        { name: "Sexually transmitted infections excluding HIV", value: 0.002869 }
      ] }
    ] },
    { name: "Injuries", children: [
      { name: "Unintentional injuries", children: [
        { name: "Falls", value: 0.026456 },
        { name: "Drowning", value: 0.006092 },
        { name: "Exposure to mechanical forces", value: 0.003820 },
        { name: "Fire, heat, and hot substances", value: 0.003813 },
        { name: "Animal contact", value: 0.002027 },
        { name: "Foreign body", value: 0.002354 },
        { name: "Adverse effects of medical treatment", value: 0.001409 },
        { name: "Environmental heat and cold exposure", value: 0.001132 },
        { name: "Electrocution", value: 0.000942 },
        { name: "Poisonings", value: 0.001317 },
        { name: "Exposure to forces of nature", value: 0.001713 },
        { name: "Other unintentional injuries", value: 0.004552 }
      ] },
      { name: "Transport injuries", children: [
        { name: "Road injuries", value: 0.026918 },
        { name: "Other transport injuries", value: 0.001686 }
      ] },
      { name: "Self-harm and interpersonal violence", children: [
        { name: "Self-harm", value: 0.012611 },
        { name: "Interpersonal violence", value: 0.010803 },
        { name: "Conflict and terrorism", value: 0.004725 },
        { name: "Police conflict and executions", value: 0.000373 }
      ] }
    ] }
  ] },
};

// ── Layout ────────────────────────────────────────────────────────────────────

const W = window.innerWidth;
const H = window.innerHeight;
const TOP    = 92; // px reserved for Reveal.js slide title overlay
const BOTTOM = 52; // px reserved for Reveal.js section-nav footer + controls

function buildLayout(yearData) {
  const root = d3.hierarchy(yearData)
    .sum(d => d.value)
    .sort((a, b) => b.value - a.value);
  d3.treemap()
    .size([W, H - TOP - BOTTOM])
    .paddingOuter(2)
    .paddingInner(1.5)
    .round(true)(root);
  return root;
}

const root1990 = buildLayout(DATA[1990]);
const root2023 = buildLayout(DATA[2023]);

// Position lookup for 2023 by L3 name
const pos2023 = new Map(root2023.leaves().map(d => [d.data.name, d]));

// ── SVG ───────────────────────────────────────────────────────────────────────

const svg = d3.select("#chart")
  .append("svg")
  .attr("width", W)
  .attr("height", H)
  .style("display", "block");

svg.append("rect").attr("width", W).attr("height", H).attr("fill", "#11111e");

// ── Cell helpers ──────────────────────────────────────────────────────────────

function cellColor(d) {
  // d is an L3 leaf; its parent is the L2 group
  return L2_COLORS[d.parent?.data?.name] || "#555";
}

function addLabels(g, name, pct, cw, ch) {
  if (cw < 30 || ch < 20) return;
  const display = cw > 110 ? name : (SHORT[name] || name);
  const fontSize = cw > 90 ? 12 : 10;
  const cx = cw / 2;
  const maxChars = Math.floor((cw - 8) / (fontSize * 0.55));
  const words = display.split(" ");
  const lines = [];
  let current = "";
  for (const w of words) {
    const candidate = current ? current + " " + w : w;
    if (candidate.length <= maxChars) { current = candidate; }
    else { if (current) lines.push(current); current = w; }
  }
  if (current) lines.push(current);

  const lineH = fontSize + 2;
  const showPct = ch > lineH * (lines.length + 1) + 4;
  const totalH = lineH * lines.length + (showPct ? lineH : 0);
  let y0 = (ch - totalH) / 2 + fontSize;

  const textStyle = g => g
    .attr("text-anchor", "middle")
    .attr("fill", "#ffffff")
    .attr("font-family", "Inter, system-ui, sans-serif")
    .attr("font-weight", "600")
    .style("paint-order", "stroke")
    .style("stroke", "rgba(0,0,0,0.5)")
    .style("stroke-width", "2px");

  lines.forEach((line, i) => {
    g.append("text")
      .attr("class", "cell-label")
      .attr("x", cx).attr("y", y0 + i * lineH)
      .attr("font-size", fontSize)
      .call(textStyle)
      .text(line);
  });

  if (showPct) {
    g.append("text")
      .attr("class", "cell-label")
      .attr("x", cx).attr("y", y0 + lines.length * lineH)
      .attr("font-size", fontSize - 1)
      .attr("text-anchor", "middle")
      .attr("fill", "rgba(255,255,255,0.75)")
      .attr("font-family", "Inter, system-ui, sans-serif")
      .style("paint-order", "stroke")
      .style("stroke", "rgba(0,0,0,0.4)")
      .style("stroke-width", "2px")
      .text(pct);
  }
}

// ── Initial render (1990) ─────────────────────────────────────────────────────

// Offset all cells down by TOP to leave room for the title overlay
const leaves1990 = root1990.leaves();

const cell = svg.selectAll("g.cell")
  .data(leaves1990, d => d.data.name)
  .join("g")
    .attr("class", "cell")
    .attr("transform", d => `translate(${d.x0},${d.y0 + TOP})`);

cell.append("rect")
  .attr("width",  d => Math.max(0, d.x1 - d.x0))
  .attr("height", d => Math.max(0, d.y1 - d.y0))
  .attr("fill",   d => cellColor(d))
  .attr("rx", 2).attr("ry", 2);

cell.each(function(d) {
  const cw = d.x1 - d.x0;
  const ch = d.y1 - d.y0;
  addLabels(d3.select(this), d.data.name, (d.data.value * 100).toFixed(1) + "%", cw, ch);
});


// ── Year label (drawn after legend so it renders on top) ─────────────────────

const yearLabel = svg.append("text")
  .attr("x", W - 14)
  .attr("y", H - BOTTOM - 8)
  .attr("text-anchor", "end")
  .attr("fill", "rgba(232,232,240,0.55)")
  .attr("font-size", 11)
  .attr("font-family", "Inter, system-ui, sans-serif")
  .text("GBD 1990 · Global DALYs · Source: IHME");

// ── Tooltip ───────────────────────────────────────────────────────────────────

const tooltip = d3.select("body").append("div")
  .style("position", "fixed")
  .style("pointer-events", "none")
  .style("background", "rgba(17,17,30,0.92)")
  .style("border", "1px solid rgba(255,255,255,0.15)")
  .style("border-radius", "6px")
  .style("padding", "8px 12px")
  .style("font-family", "Inter, system-ui, sans-serif")
  .style("font-size", "13px")
  .style("color", "#e8e8f0")
  .style("line-height", "1.5")
  .style("max-width", "260px")
  .style("opacity", "0")
  .style("transition", "opacity 0.15s");

let currentYear = 1990;

cell.on("mousemove", function(event, d) {
    const l2 = d.parent?.data?.name || "";
    const pct = (d.data.value * 100).toFixed(2) + "%";
    tooltip
      .style("opacity", "1")
      .style("left", (event.clientX + 14) + "px")
      .style("top",  (event.clientY - 10) + "px")
      .html(`<strong>${d.data.name}</strong><br><span style="color:#888899">${l2}</span><br><span style="color:#ffd166">${pct} of global DALYs (${currentYear})</span>`);
  })
  .on("mouseleave", () => tooltip.style("opacity", "0"));

// ── Phase controller ──────────────────────────────────────────────────────────

let currentPhase = 0;
const MAX_PHASE = 1;
let transitioning = false;

function advancePhase() {
  if (transitioning || currentPhase >= MAX_PHASE) return;
  transitioning = true;
  currentPhase++;
  if (currentPhase === 1) transitionTo2023();
}

function transitionTo2023() {
  const DUR = 900;
  currentYear = 2023;

  // Fade out labels
  svg.selectAll(".cell-label")
    .transition().duration(DUR / 3)
    .style("opacity", 0);

  // Morph each cell to 2023 position and size
  cell.transition().duration(DUR).ease(d3.easeCubicInOut)
    .attr("transform", d => {
      const t = pos2023.get(d.data.name);
      return t ? `translate(${t.x0},${t.y0 + TOP})` : `translate(${d.x0},${d.y0 + TOP})`;
    });

  cell.select("rect")
    .transition().duration(DUR).ease(d3.easeCubicInOut)
    .attr("width",  d => { const t = pos2023.get(d.data.name); return Math.max(0, t ? t.x1 - t.x0 : d.x1 - d.x0); })
    .attr("height", d => { const t = pos2023.get(d.data.name); return Math.max(0, t ? t.y1 - t.y0 : d.y1 - d.y0); });

  // Add new 2023-only cells (e.g. COVID-19 which had value 0 in 1990)
  const names1990 = new Set(leaves1990.map(d => d.data.name));
  const newLeaves = root2023.leaves().filter(d => !names1990.has(d.data.name));
  if (newLeaves.length) {
    const newCells = svg.selectAll("g.cell-new")
      .data(newLeaves, d => d.data.name)
      .join("g")
        .attr("class", "cell cell-new")
        .attr("transform", d => `translate(${d.x0},${d.y0 + TOP})`)
        .style("opacity", 0);
    newCells.append("rect")
      .attr("width",  d => Math.max(0, d.x1 - d.x0))
      .attr("height", d => Math.max(0, d.y1 - d.y0))
      .attr("fill",   d => cellColor(d))
      .attr("rx", 2).attr("ry", 2);
    newCells.transition().delay(DUR * 0.6).duration(DUR * 0.4)
      .style("opacity", 1);
  }

  // After transition: refresh labels and year marker
  setTimeout(() => {
    svg.selectAll(".cell-label").remove();
    const byName = new Map(root2023.leaves().map(d => [d.data.name, d]));
    svg.selectAll("g.cell").each(function(d) {
      const d2 = byName.get(d.data.name);
      if (!d2) return;
      addLabels(d3.select(this), d2.data.name, (d2.data.value * 100).toFixed(1) + "%", d2.x1 - d2.x0, d2.y1 - d2.y0);
    });
    svg.selectAll(".cell-label").style("opacity", 0)
      .transition().duration(300).style("opacity", 1);

    yearLabel.text("GBD 2023 · Global DALYs · Source: IHME");
    transitioning = false;
    removeListeners();
  }, DUR + 50);
}

// ── Event handling ────────────────────────────────────────────────────────────

function onClick() { advancePhase(); }
function onKeyDown(e) {
  if (e.key === "ArrowRight" || e.key === " ") advancePhase();
}
function removeListeners() {
  document.removeEventListener("click", onClick);
  document.removeEventListener("keydown", onKeyDown);
}

document.addEventListener("click", onClick);
document.addEventListener("keydown", onKeyDown);

// Reveal.js fragment integration (background-iframe pattern)
try { window.parent.Reveal.on("fragmentshown", advancePhase); } catch (_) {}
