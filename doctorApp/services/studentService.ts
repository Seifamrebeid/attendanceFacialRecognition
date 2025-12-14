import { studentsCSV } from './studentsData';

export interface Student {
    id: string;
    studentNumber: string;
    name: string;
    email: string;
    photoUrl: string | null;
    photoDriveId: string | null;
}

let cachedStudents: Student[] = [];

export const loadStudentsFromCSV = async (): Promise<Student[]> => {
    if (cachedStudents.length > 0) {
        return cachedStudents;
    }

    try {
        // Parse CSV from imported string
        const students = parseCSV(studentsCSV);
        cachedStudents = students;

        console.log(`✅ Loaded ${students.length} students from CSV data`);
        return students;
    } catch (error) {
        console.error('Error loading students from CSV:', error);
        return [];
    }
};

const parseCSV = (csvText: string): Student[] => {
    const lines = csvText.trim().split('\n');
    const students: Student[] = [];

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Handle CSV parsing (respecting quotes)
        const values: string[] = [];
        let inQuote = false;
        let currentValue = '';

        for (let char of line) {
            if (char === '"') {
                inQuote = !inQuote;
            } else if (char === ',' && !inQuote) {
                values.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        values.push(currentValue.trim());

        const name = values[0]?.replace(/^"|"$/g, '') || '';
        const studentNumber = (values[1]?.replace(/^"|"$/g, '') || '').trim();

        if (!name || !studentNumber) continue;

        // Try to find photo ID
        let photoId = '';
        let email = '';

        for (let j = 2; j < values.length; j++) {
            const val = values[j];

            if (val.includes('@') && !val.includes('drive.google.com')) {
                email = val;
            } else if (val.includes('drive.google.com') || (val.length > 20 && !val.includes(' '))) {
                if (val.includes('id=')) {
                    const match = val.match(/id=([a-zA-Z0-9_-]+)/);
                    if (match) photoId = match[1];
                } else if (val.includes('/d/')) {
                    const match = val.match(/\/d\/([a-zA-Z0-9_-]+)/);
                    if (match) photoId = match[1];
                } else if (val.length > 20 && /^[a-zA-Z0-9_-]+$/.test(val)) {
                    photoId = val;
                }
            }
        }

        if (!email) {
            email = `${studentNumber}@student.university.edu`;
        }

        const photoUrl = photoId ? `https://drive.google.com/uc?export=view&id=${photoId}` : null;

        students.push({
            id: studentNumber,
            studentNumber,
            name,
            email,
            photoUrl,
            photoDriveId: photoId
        });
    }

    return students;
};

export const getStudentPhoto = async (studentId: string): Promise<string | null> => {
    const students = await loadStudentsFromCSV();
    const student = students.find(s => s.id === studentId || s.studentNumber === studentId);
    return student?.photoUrl || null;
};

export const getStudentByName = async (name: string): Promise<Student | undefined> => {
    const students = await loadStudentsFromCSV();
    return students.find(s => s.name.toLowerCase() === name.toLowerCase());
};

// Helper to extract student ID from name string "John_Doe_123"
export const parseStudentInfo = (fullName: string) => {
    if (!fullName) return { name: 'Unknown', id: '' };

    const lastUnderscoreIndex = fullName.lastIndexOf('_');
    if (lastUnderscoreIndex === -1) return { name: fullName, id: '' };

    const name = fullName.substring(0, lastUnderscoreIndex).replace(/_/g, ' ');
    const id = fullName.substring(lastUnderscoreIndex + 1);

    return { name, id };
};
