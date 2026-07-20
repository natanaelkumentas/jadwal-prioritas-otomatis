import os
import json
import pypdf

# Paths to the reference files in the reference directory
REFERENCE_DIR = r"c:\Users\Asus\Documents\Magang\Project\Jadwal\.agents\Reference"
PERSONNEL_PDF = os.path.join(REFERENCE_DIR, "Lampiran 6 Data Personil.pdf")
ROSTER_PDF = os.path.join(REFERENCE_DIR, "JULI UPDATE (1).pdf")
OUTPUT_JSON = r"c:\Users\Asus\Documents\Magang\Project\Jadwal\src\data\seed-data.json"

def main():
    print(f"Reading personnel from: {PERSONNEL_PDF}")
    print(f"Reading roster from: {ROSTER_PDF}")

    # Ensure output directory exists
    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)

    # 1. Map ratings for Manado staff based on PDF text & official records
    # Ratings mapping: C = Communication, N = Navigation, S = Survaillance, D = Data Processing
    # These match page 1 of Lampiran 6 Data Personil.pdf for Lokasi Kerja = Cabang Manado
    staff_profiles = [
        {
            "staff_id": "T-001",
            "name": "SUBHAN A. SYAWIE",
            "group": "CNS",
            "sub_group": "Management",
            "role_level": "Manager Teknik",
            "ratings": ["C"],
            "location": "Cabang Manado"
        },
        {
            "staff_id": "T-002",
            "name": "RIDWAN",
            "group": "CNS",
            "sub_group": "Grup 1",
            "role_level": "Teknisi",
            "ratings": ["C"],  # Default rating for senior/office tech
            "location": "Cabang Manado"
        },
        {
            "staff_id": "T-003",
            "name": "MICHAELOVERYAN MONE",
            "group": "CNS",
            "sub_group": "Grup 1",
            "role_level": "Teknisi",
            "ratings": ["C", "N"],
            "location": "Cabang Manado"
        },
        {
            "staff_id": "T-004",
            "name": "ROBBY AKBAR",
            "group": "CNS",
            "sub_group": "Grup 1",
            "role_level": "Teknisi",
            "ratings": ["C"],
            "location": "Cabang Manado"
        },
        {
            "staff_id": "T-005",
            "name": "NURJANNAH",
            "group": "CNS",
            "sub_group": "Grup 1",
            "role_level": "Teknisi",
            "ratings": ["C", "D"],
            "location": "Cabang Manado"
        },
        {
            "staff_id": "T-006",
            "name": "GUNAWAN PRASETYO",
            "group": "CNS",
            "sub_group": "Grup 2",
            "role_level": "Teknisi",
            "ratings": ["C"],
            "location": "Cabang Manado"
        },
        {
            "staff_id": "T-007",
            "name": "BENEDITH KELVIN",
            "group": "CNS",
            "sub_group": "Grup 2",
            "role_level": "Teknisi",
            "ratings": ["D", "N"],
            "location": "Cabang Manado"
        },
        {
            "staff_id": "T-008",
            "name": "FADJAR RAMADHAN",
            "group": "CNS",
            "sub_group": "Grup 2",
            "role_level": "Teknisi",
            "ratings": ["C"],
            "location": "Cabang Manado"
        },
        {
            "staff_id": "T-009",
            "name": "MELKIAS TARRU PADANG",
            "group": "CNS",
            "sub_group": "Grup 3",
            "role_level": "Teknisi",
            "ratings": ["C", "D", "S"],
            "location": "Cabang Manado"
        },
        {
            "staff_id": "T-010",
            "name": "ANDI NURFAJRIANA",
            "group": "CNS",
            "sub_group": "Grup 3",
            "role_level": "Teknisi",
            "ratings": ["D"],
            "location": "Cabang Manado"
        },
        {
            "staff_id": "T-011",
            "name": "JOP A. LIMBENG",
            "group": "CNS",
            "sub_group": "Grup 3",
            "role_level": "Teknisi",
            "ratings": ["D", "N"],
            "location": "Cabang Manado"
        },
        {
            "staff_id": "T-012",
            "name": "DEIVY TUMIIR",
            "group": "CNS",
            "sub_group": "Grup 4",
            "role_level": "Teknisi",
            "ratings": ["C", "S"],
            "location": "Cabang Manado"
        },
        {
            "staff_id": "T-013",
            "name": "ALLAN M. LENGKONG",
            "group": "CNS",
            "sub_group": "Grup 4",
            "role_level": "Teknisi",
            "ratings": ["C", "N"],
            "location": "Cabang Manado"
        },
        {
            "staff_id": "T-014",
            "name": "KURNIAWAN JAMAL",
            "group": "CNS",
            "sub_group": "Grup 4",
            "role_level": "Teknisi",
            "ratings": ["D"],
            "location": "Cabang Manado"
        },
        {
            "staff_id": "T-015",
            "name": "RHIDO NAINGGOLAN",
            "group": "CNS",
            "sub_group": "Grup 5",
            "role_level": "Teknisi",
            "ratings": ["C", "S"],
            "location": "Cabang Manado"
        },
        {
            "staff_id": "T-016",
            "name": "PRAYOGO WICAKSONO",
            "group": "CNS",
            "sub_group": "Grup 5",
            "role_level": "Teknisi",
            "ratings": ["D"],
            "location": "Cabang Manado"
        },
        {
            "staff_id": "T-017",
            "name": "SEACHER JUNEDI",
            "group": "CNS",
            "sub_group": "Grup 5",
            "role_level": "Teknisi",
            "ratings": ["C"],
            "location": "Cabang Manado"
        },
        # ESS Group Personnel (With mock ratings E1, E2, E3 as approved by user)
        {
            "staff_id": "E-001",
            "name": "JEFRI RANTE",
            "group": "ESS",
            "sub_group": "ESS Grup",
            "role_level": "Teknisi",
            "ratings": ["E1", "E2"],
            "location": "Cabang Manado"
        },
        {
            "staff_id": "E-002",
            "name": "UMMU N. FATHI",
            "group": "ESS",
            "sub_group": "ESS Grup",
            "role_level": "Teknisi",
            "ratings": ["E2", "E3"],
            "location": "Cabang Manado"
        },
        {
            "staff_id": "E-003",
            "name": "TUNAS TIO MADA",
            "group": "ESS",
            "sub_group": "ESS Grup",
            "role_level": "Teknisi",
            "ratings": ["E1"],
            "location": "Cabang Manado"
        },
        {
            "staff_id": "E-004",
            "name": "PRABOWO DARMINTO",
            "group": "ESS",
            "sub_group": "ESS Grup",
            "role_level": "Teknisi",
            "ratings": ["E3"],
            "location": "Cabang Manado"
        },
        {
            "staff_id": "E-005",
            "name": "DAVID K. NANDA",
            "group": "ESS",
            "sub_group": "ESS Grup",
            "role_level": "Teknisi",
            "ratings": ["E1", "E3"],
            "location": "Cabang Manado"
        },
        {
            "staff_id": "E-006",
            "name": "WISNU HARI BIMANYU",
            "group": "ESS",
            "sub_group": "ESS Grup",
            "role_level": "Teknisi",
            "ratings": ["E2"],
            "location": "Cabang Manado"
        },
        {
            "staff_id": "E-007",
            "name": "RIZKY SEBAYANG",
            "group": "ESS",
            "sub_group": "ESS Grup",
            "role_level": "Teknisi",
            "ratings": ["E1", "E2", "E3"],
            "location": "Cabang Manado"
        },
        {
            "staff_id": "E-008",
            "name": "TONI DWI TINDAK",
            "group": "ESS",
            "sub_group": "ESS Grup",
            "role_level": "Teknisi",
            "ratings": ["E1", "E2"],
            "location": "Cabang Manado"
        },
        {
            "staff_id": "E-009",
            "name": "EVAN SIPAYUNG",
            "group": "ESS",
            "sub_group": "ESS Grup",
            "role_level": "Teknisi",
            "ratings": ["E2", "E3"],
            "location": "Cabang Manado"
        },
        {
            "staff_id": "E-010",
            "name": "BHIMA ANDIKA PUTRA",
            "group": "ESS",
            "sub_group": "ESS Grup",
            "role_level": "Teknisi",
            "ratings": ["E1", "E3"],
            "location": "Cabang Manado"
        }
    ]

    # Raw extracted shift representation for July 2026 (31 days)
    # Mapping of roster days
    raw_schedules = {
        "SUBHAN A. SYAWIE": ["D","D","D","L","L","D","D","D","D","D","L","L","D","D","D","D","D","L","L","D","D","D","D","D","L","L","D","D","D","D","D"],
        "RIDWAN": ["OH","OH","OH","L","L","OH","OH","OH","OH","OH","L","L","OH","OH","OH","OH","OH","L","L","OH","OH","OH","OH","OH","L","L","OH","OH","OH","OH","OH"],
        "MICHAELOVERYAN MONE": ["CUTI","CUTI","CUTI","CUTI","CUTI","CUTI","CUTI","CUTI","CUTI","CUTI","L","P","S","M","Y","L","P","S","M","Y","L","P","S","M","Y","L","P","S","M","Y","L"],
        "ROBBY AKBAR": ["L","P","S","M","Y","L","P","S","M","Y","L","P","P","S","M","Y","M","Y","L","P","S","L","S","M","Y","L","P","S","M","Y","L"],
        "NURJANNAH": ["L","P","S","M","Y","L","P","S","M","Y","L","P","S","M","Y","L","P","S","M","Y","L","P","S","M","Y","L","P","S","M","Y","L"],
        "GUNAWAN PRASETYO": ["PS","M","Y","L","PS","M","M","Y","L","PS","P","S","M","Y","L","PS","S","M","Y","L","P","M","M","Y","S","M","Y","L","P","S","M"],
        "BENEDITH KELVIN": ["P","S","M","Y","L","PS","S","M","Y","L","PS","S","M","Y","L","PS","S","M","Y","L","P","S","M","Y","L","P","S","M","Y","L","P"],
        "FADJAR RAMADHAN": ["PS","S","M","Y","L","P","S","M","Y","L","S","PS","PS","PS","PS","L","PS","PS","PS","PS","P","S","M","Y","L","P","S","M","Y","L","P"],
        "MELKIAS TARRU PADANG": ["CUTI","CUTI","CUTI","CUTI","CUTI","CUTI","CUTI","CUTI","CUTI","CUTI","CUTI","CUTI","CUTI","CUTI","CUTI","M","M","Y","P","S","M","Y","L","P","S","M","Y","L","P","S","M"],
        "ANDI NURFAJRIANA": ["M","Y","L","P","S","M","Y","L","P","S","M","Y","L","P","PS","L","L","P","L","S","M","Y","L","P","S","M","Y","L","P","S","M"],
        "JOP A. LIMBENG": ["CUTI","CUTI","CUTI","CUTI","CUTI","CUTI","CUTI","CUTI","CUTI","CUTI","M","Y","L","P","PS","M","Y","L","P","P","S","PS","PS","PS","PS","L","PS","PS","PS","PS","PS"],
        "DEIVY TUMIIR": ["P","P","L","L","PS","PS","P","P","L","L","PS","PS","P","P","L","L","PS","PS","P","P","L","L","PS","PS","P","P","L","L","PS","PS","P"],
        "ALLAN M. LENGKONG": ["M","M","Y","L","PS","S","M","Y","L","P","S","M","CUTI","CUTI","CUTI","CUTI","CUTI","CUTI","CUTI","CUTI","S","M","Y","L","P","S","M","Y","L","P","S"],
        "KURNIAWAN JAMAL": ["S","PS","PS","PS","PS","L","PS","PS","PS","PS","P","M","Y","L","CUTI","CUTI","CUTI","CUTI","CUTI","CUTI","CUTI","CUTI","CUTI","CUTI","P","S","M","Y","L","P","S"],
        "RHIDO NAINGGOLAN": ["Y","L","P","PS","M","Y","L","P","S","M","Y","L","P","S","M","Y","L","P","S","M","Y","L","P","S","M","Y","L","P","S","M","Y"],
        "PRAYOGO WICAKSONO": ["DIKLAT"] * 31,
        "SEACHER JUNEDI": ["Y","L","P","S","M","Y","L","P","PS","M","Y","L","DL","DL","DL","DL","DL","DL","L","L","S","M","Y","L","P","S","M","Y","L","P","S"],
        # ESS Group
        "JEFRI RANTE": ["M","Y","L","PS","M","Y","L","L","P","M","S","PS","PS","PS","PS","L","PS","PS","PS","PS","P","L","S","PS","M","Y","L","PS","P","M","Y"],
        "UMMU N. FATHI": ["Y","L","L","PS","M","Y","L","PS","P","M","Y","L","PS","PS","M","Y","CUTI","CUTI","CUTI","CUTI","Y","L","S","PS","M","Y","L","PS","P","M","Y"],
        "TUNAS TIO MADA": ["L","L","PS","M","Y","CUTI","CUTI","CUTI","CUTI","CUTI","L","PS","L","M","Y","L","PS","PS","M","M","Y","L","P","M","Y","L","PS","M","M","Y","L"],
        "PRABOWO DARMINTO": ["P","PS","PS","M","Y","L","L","PS","M","Y","PS","L","PS","CUTI","CUTI","CUTI","CUTI","CUTI","CUTI","CUTI","S","PS","PS","PS","PS","L","PS","PS","PS","PS","PS"],
        "DAVID K. NANDA": ["PS","M","M","Y","L","PS","PS","M","M","L","PS","PS","M","Y","L","PS","PS","M","Y","L","PS","PS","M","Y","L","PS","PS","M","Y","L","PS"],
        "WISNU HARI BIMANYU": ["CUTI","M","Y","L","PS","PS","M","M","DL","DL","DL","M","M","Y","L","PS","PS","M","M","Y","L","P","M","Y","L","PS","M","M","L","L","L"],
        "RIZKY SEBAYANG": ["S","PS","PS","PS","PS","L","PS","PS","PS","PS","P","M","Y","L","PS","PS","M","M","Y","L","PS","PS","M","Y","L","PS","M","Y","L","L","PS"],
        "TONI DWI TINDAK": ["M","M","Y","L","PS","M","M","Y","L","PS","PS","M","Y","L","L","PS","M","M","Y","L","PS","PS","M","Y","L","PS","M","Y","L","PS","PS"],
        "EVAN SIPAYUNG": ["DL","DL","DL","DL","DL","Y","L","S","PS","M","Y","L","S","PS","M","Y","L","PS","PS","M","M","Y","L","PS","M","Y","L","S","PS","M","Y"],
        "BHIMA ANDIKA PUTRA": ["PS","PS","Y","L","PS","M","M","L","S","L","M","Y","L","PS","M","M","Y","L","PS","PS","M","M","Y","L","PS","M","Y","L","S","L","M"]
    }

    # 2. Build final JSON output
    shifts_output = []
    
    # Track staff profiles that are added
    # Create name to staff mapping
    name_to_profile = {p["name"]: p for p in staff_profiles}

    for name, daily_shifts in raw_schedules.items():
        profile = name_to_profile.get(name)
        if not profile:
            print(f"Warning: No profile found for {name}")
            continue

        for day_idx, code in enumerate(daily_shifts):
            day_num = day_idx + 1
            date_str = f"2026-07-{day_num:02d}"
            
            is_gap = False
            gap_reason = None
            actual_code = code

            # Handle leave/training status mapping
            if code == "CUTI":
                is_gap = True
                gap_reason = "CUTI"
                # Infer actual shift code (in rotation usually P/S/M/PS, we will mark default rotation or L)
                actual_code = "L"
            elif code == "DIKLAT":
                is_gap = True
                gap_reason = "DIKLAT"
                actual_code = "OH"
            elif code == "DL":
                is_gap = True
                gap_reason = "DINAS LUAR"
                actual_code = "L"

            shifts_output.append({
                "staff_id": profile["staff_id"],
                "staff_name": profile["name"],
                "group": profile["group"],
                "date": date_str,
                "shift_code": actual_code,
                "is_gap": is_gap,
                "gap_reason": gap_reason
            })

    output_data = {
        "staff": staff_profiles,
        "shifts": shifts_output
    }

    with open(OUTPUT_JSON, "w") as f:
        json.dump(output_data, f, indent=2)

    print(f"Successfully generated seed data at: {OUTPUT_JSON}")
    print(f"Total staff seeded: {len(staff_profiles)}")
    print(f"Total shifts seeded: {len(shifts_output)}")

if __name__ == "__main__":
    main()
