/** Indian first/last name pools for demo residents. */
export const FEMALE_FIRST = [
  "Aadhya", "Ananya", "Diya", "Isha", "Kavya", "Meera", "Nisha", "Pooja",
  "Riya", "Saanvi", "Shreya", "Tanvi", "Vidya", "Zara", "Lakshmi", "Priya",
  "Sneha", "Divya", "Harini", "Keerthi",
];

export const MALE_FIRST = [
  "Aarav", "Aditya", "Arjun", "Dev", "Karan", "Manish", "Nikhil", "Pranav",
  "Rahul", "Rohan", "Siddharth", "Varun", "Vikram", "Yash", "Akash", "Harsh",
  "Kunal", "Neel", "Raj", "Suresh",
];

export const LAST_NAMES = [
  "Sharma", "Patel", "Reddy", "Nair", "Iyer", "Gupta", "Singh", "Khan",
  "Das", "Menon", "Pillai", "Verma", "Joshi", "Rao", "Chopra", "Malhotra",
  "Bose", "Desai", "Kulkarni", "Narayan",
];

export const CITIES = [
  "Bangalore", "Hyderabad", "Chennai", "Pune", "Kochi", "Mumbai",
  "Delhi", "Jaipur", "Indore", "Visakhapatnam",
];

export const ID_TYPES = ["Aadhaar", "PAN", "Passport", "Voter ID"];

/** @typedef {'female' | 'male' | 'mixed'} GenderHint */

/** @typedef {{ name: string; code: string; floors: number; roomsPerFloor: number; bedPattern: 'singles' | 'doubles' | 'mixed' | 'mostly-triple' }} BlockSpec */

/** @typedef {{ slug: string; name: string; address: string; gender: GenderHint; blocks: BlockSpec[] }} HostelSpec */

/** @typedef {{ username: string; fullName: string; email: string; hostels: HostelSpec[] }} OwnerSpec */

/** @type {OwnerSpec[]} */
export const OWNERS = [
  {
    username: "arjun_mehta",
    fullName: "Arjun Mehta",
    email: "arjun.mehta@example.com",
    hostels: [
      {
        slug: "demo-a-green-view-girls",
        name: "Green View Girls Hostel",
        address: "12 MG Road, Bangalore, Karnataka",
        gender: "female",
        blocks: [
          { name: "Girls Tower", code: "GT", floors: 8, roomsPerFloor: 10, bedPattern: "mixed" },
          { name: "Annex Wing", code: "AX", floors: 4, roomsPerFloor: 6, bedPattern: "doubles" },
        ],
      },
      {
        slug: "demo-a-sunrise-boys",
        name: "Sunrise Boys Hostel",
        address: "45 Residency Road, Bangalore, Karnataka",
        gender: "male",
        blocks: [
          { name: "Boys Block A", code: "BA", floors: 6, roomsPerFloor: 9, bedPattern: "mixed" },
          { name: "Boys Block B", code: "BB", floors: 5, roomsPerFloor: 8, bedPattern: "mostly-triple" },
        ],
      },
      {
        slug: "demo-a-lakeview-residence",
        name: "Lakeview Co-ed Residence",
        address: "8 Boat Club Road, Pune, Maharashtra",
        gender: "mixed",
        blocks: [
          { name: "North Wing", code: "NW", floors: 5, roomsPerFloor: 7, bedPattern: "doubles" },
          { name: "South Wing", code: "SW", floors: 5, roomsPerFloor: 7, bedPattern: "mixed" },
        ],
      },
    ],
  },
  {
    username: "bhavya_reddy",
    fullName: "Bhavya Reddy",
    email: "bhavya.reddy@example.com",
    hostels: [
      {
        slug: "demo-b-heritage-girls",
        name: "Heritage Girls Hostel",
        address: "22 Anna Salai, Chennai, Tamil Nadu",
        gender: "female",
        blocks: [
          { name: "Heritage Tower", code: "HT", floors: 10, roomsPerFloor: 8, bedPattern: "mixed" },
        ],
      },
      {
        slug: "demo-b-reddy-boys-pg",
        name: "Reddy Boys PG",
        address: "3 Banjara Hills, Hyderabad, Telangana",
        gender: "male",
        blocks: [
          { name: "Main Block", code: "MB", floors: 7, roomsPerFloor: 10, bedPattern: "mostly-triple" },
          { name: "Study Block", code: "SB", floors: 4, roomsPerFloor: 6, bedPattern: "singles" },
        ],
      },
      {
        slug: "demo-b-twin-towers",
        name: "Twin Towers Residence",
        address: "100 HITEC City, Hyderabad, Telangana",
        gender: "mixed",
        blocks: [
          { name: "Girls Tower", code: "GT", floors: 10, roomsPerFloor: 6, bedPattern: "doubles" },
          { name: "Boys Tower", code: "BT", floors: 10, roomsPerFloor: 6, bedPattern: "doubles" },
        ],
      },
      {
        slug: "demo-b-scholars-nest",
        name: "Scholar's Nest",
        address: "5 University Road, Chennai, Tamil Nadu",
        gender: "mixed",
        blocks: [
          { name: "Academic Block", code: "AB", floors: 3, roomsPerFloor: 12, bedPattern: "singles" },
        ],
      },
      {
        slug: "demo-b-metro-stay",
        name: "Metro Stay Co-ed",
        address: "18 Andheri East, Mumbai, Maharashtra",
        gender: "mixed",
        blocks: [
          { name: "Metro Wing A", code: "MA", floors: 6, roomsPerFloor: 8, bedPattern: "mixed" },
          { name: "Metro Wing B", code: "MB", floors: 6, roomsPerFloor: 8, bedPattern: "doubles" },
        ],
      },
    ],
  },
  {
    username: "chitra_nair",
    fullName: "Chitra Nair",
    email: "chitra.nair@example.com",
    hostels: [
      {
        slug: "demo-c-kerala-girls",
        name: "Kerala Girls Hostel",
        address: "7 Marine Drive, Kochi, Kerala",
        gender: "female",
        blocks: [
          { name: "Backwater Tower", code: "BW", floors: 6, roomsPerFloor: 7, bedPattern: "mixed" },
        ],
      },
      {
        slug: "demo-c-coastal-boys",
        name: "Coastal Boys Hostel",
        address: "2 Beach Road, Kochi, Kerala",
        gender: "male",
        blocks: [
          { name: "Sea Breeze Block", code: "SB", floors: 5, roomsPerFloor: 9, bedPattern: "mostly-triple" },
        ],
      },
      {
        slug: "demo-c-palm-grove",
        name: "Palm Grove Residence",
        address: "14 Palm Avenue, Mumbai, Maharashtra",
        gender: "mixed",
        blocks: [
          { name: "Palm Tower", code: "PT", floors: 8, roomsPerFloor: 5, bedPattern: "doubles" },
        ],
      },
      {
        slug: "demo-c-rajasthani-girls",
        name: "Rajasthani Girls Hostel",
        address: "9 MI Road, Jaipur, Rajasthan",
        gender: "female",
        blocks: [
          { name: "Haveli Wing", code: "HW", floors: 4, roomsPerFloor: 8, bedPattern: "mixed" },
        ],
      },
      {
        slug: "demo-c-indore-boys",
        name: "Indore Boys PG",
        address: "21 AB Road, Indore, Madhya Pradesh",
        gender: "male",
        blocks: [
          { name: "Central Block", code: "CB", floors: 5, roomsPerFloor: 10, bedPattern: "mixed" },
        ],
      },
      {
        slug: "demo-c-vizag-students",
        name: "Vizag Students Home",
        address: "4 Beach Road, Visakhapatnam, Andhra Pradesh",
        gender: "mixed",
        blocks: [
          { name: "Bay View", code: "BV", floors: 4, roomsPerFloor: 9, bedPattern: "singles" },
          { name: "Hill View", code: "HV", floors: 3, roomsPerFloor: 8, bedPattern: "doubles" },
        ],
      },
      {
        slug: "demo-c-delhi-girls",
        name: "Delhi Girls Hostel",
        address: "6 Connaught Place, Delhi",
        gender: "female",
        blocks: [
          { name: "Capital Tower", code: "CT", floors: 7, roomsPerFloor: 6, bedPattern: "doubles" },
        ],
      },
      {
        slug: "demo-c-pune-tech-boys",
        name: "Pune Tech Boys Hostel",
        address: "33 Hinjewadi Phase 1, Pune, Maharashtra",
        gender: "male",
        blocks: [
          { name: "Tech Block A", code: "TA", floors: 6, roomsPerFloor: 11, bedPattern: "mostly-triple" },
          { name: "Tech Block B", code: "TB", floors: 4, roomsPerFloor: 8, bedPattern: "mixed" },
        ],
      },
    ],
  },
];

export const DEMO_PASSWORD = "Vaikuntham@1234";
export const DEMO_SLUG_PREFIXES = ["demo-a-", "demo-b-", "demo-c-"];
