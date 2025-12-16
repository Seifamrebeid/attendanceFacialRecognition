import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import * as XLSX from 'xlsx';

/**
 * Service to handle Analytics with External Data Source integration
 */
export const analyticsService = {

    /**
     * Parse a Google Sheet/Excel file to get the "Official Student List"
     * @param {File} file - The uploaded file
     * @returns {Promise<Array>} List of students
     */
    processStudentListFile: async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });

                    // Get first sheet
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];

                    // Convert to JSON
                    const jsonData = XLSX.utils.sheet_to_json(sheet);

                    // Normalize data (look for common column names)
                    const students = jsonData.map(row => {
                        // Try to find Name/ID fields case-insensitively
                        const keys = Object.keys(row);
                        const nameKey = keys.find(k => k.toLowerCase().includes('name') || k.toLowerCase().includes('student'));
                        const idKey = keys.find(k => k.toLowerCase().includes('id') || k.toLowerCase().includes('number') || k.toLowerCase().includes('code'));

                        return {
                            rawName: row[nameKey] || 'Unknown',
                            rawId: row[idKey] || 'Unknown',
                            // Create a normalized match key
                            normalizedKey: (row[nameKey] || '').toString().toLowerCase().trim().replace(/_/g, ' ')
                        };
                    });

                    console.log(`📄 Processed ${students.length} students from Sheet`);
                    resolve(students);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        });
    },

    /**
     * specific function to get firebase attendance
     */
    getAttendanceData: async (courseId) => {
        try {
            // 1. Fetch raw attendance
            const attendanceRef = collection(db, 'attendance');
            const snapshot = await getDocs(attendanceRef);

            const records = [];
            snapshot.forEach(doc => records.push({ id: doc.id, ...doc.data() }));

            console.log(`🔥 Fetched ${records.length} records from Firebase`);

            // 2. Parse Weeks & Unique Students (Auto-Discovered)
            const allWeeks = new Set();
            const detectedStudents = new Set();

            const processedRecords = records
                // CRITICAL FIX: Do NOT filter only JOIN/PRESENT. We need Explicit Absences too.
                .map(r => {
                    // Robust Week Parsing (Original Logic)
                    let week = 1;
                    const rawWeek = r.weekNumber;
                    if (typeof rawWeek === 'number') week = rawWeek;
                    else if (typeof rawWeek === 'string') {
                        const match = rawWeek.match(/\d+/);
                        if (match) week = parseInt(match[0]);
                    }
                    if (week > 0) allWeeks.add(week);

                    // Name Parsing
                    const name = r.studentName || r.name || 'Unknown';
                    const cleanName = name.replace(/_/g, ' ').trim();
                    detectedStudents.add(cleanName);

                    return {
                        ...r,
                        cleanWeek: week,
                        cleanName: cleanName,
                        matchKey: cleanName.toLowerCase()
                    };
                });

            // Calculate Total Weeks based on finding (e.g. Max Week found is 10)
            const maxWeek = allWeeks.size > 0 ? Math.max(...allWeeks) : 1;

            return {
                records: processedRecords,
                totalWeeks: maxWeek, // Or strictly use what was found
                detectedStudents: Array.from(detectedStudents),
                weeks: Array.from(allWeeks).sort((a, b) => a - b)
            };

        } catch (error) {
            console.error("Error fetching attendance:", error);
            return { records: [], totalWeeks: 0, detectedStudents: [], weeks: [] };
        }
    },

    /**
     * The Main Calculation Engine
     */
    calculateAnalytics: (attendanceData, officialStudentList = []) => {
        const { records, totalWeeks, weeks } = attendanceData;

        // If no official list provided, use detected students
        const masterList = officialStudentList.length > 0
            ? officialStudentList
            : attendanceData.detectedStudents.map(name => ({ rawName: name, matchKey: name.toLowerCase() }));

        const analytics = masterList.map(student => {
            // Find all records for this student
            const studentRecords = records.filter(r =>
                r.matchKey.includes(student.matchKey) || student.matchKey.includes(r.matchKey)
            );

            // Unique weeks matched
            // Note: This summary function still counts "attendedWeeks" as JOIN/PRESENT only
            // We need to filter here because 'records' now contains LEFT/ABSENT too
            const validRecords = studentRecords.filter(r => ['JOIN', 'PRESENT'].includes((r.action || '').toUpperCase()));
            const attendedWeeks = new Set(validRecords.map(r => r.cleanWeek));

            const weeksCount = attendedWeeks.size;
            const percentage = totalWeeks > 0 ? (weeksCount / totalWeeks) * 100 : 0;

            return {
                name: student.rawName,
                id: student.rawId || 'N/A',
                attendedWeeks: weeksCount,
                totalWeeks: totalWeeks,
                percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
                status: percentage >= 75 ? 'Good' : (percentage >= 50 ? 'Warning' : 'Critical'),
                records: studentRecords.length
            };
        });

        return {
            students: analytics,
            summary: {
                totalStudents: masterList.length,
                averageAttendance: analytics.reduce((acc, curr) => acc + curr.percentage, 0) / (masterList.length || 1),
                totalWeeks,
                activeweeks: weeks
            }
        };
    },

    /**
     * Calculate detailed stats for a single student
     * @param {string} studentName - The student's name to analyze
     * @param {Array} allRecords - All attendance records
     * @param {number} totalWeeks - Total weeks in the course context
     * @returns {Object} Detailed stats
     */
    getStudentStats: (studentName, allRecords, totalWeeks) => {
        // Filter records for this student using the clean match key
        const searchKey = studentName.toLowerCase();

        const studentRecords = allRecords.filter(r =>
            (r.cleanName || '').toLowerCase() === searchKey ||
            (r.matchKey || '').includes(searchKey)
        );

        // Calculate basic stats
        const totalJoins = studentRecords.filter(r => ['JOIN', 'PRESENT'].includes((r.action || '').toUpperCase())).length;

        // Calculate Average Similarity/Confidence
        const similarityRecords = studentRecords.filter(r => r.similarity);
        const avgSimilarity = similarityRecords.length > 0
            ? (similarityRecords.reduce((acc, curr) => acc + curr.similarity, 0) / similarityRecords.length).toFixed(4)
            : 0;

        // Weeks Analysis (SPARSE LOGIC)
        const weekStatusMap = new Map(); // WeekNum -> 'Present' | 'Absent'

        studentRecords.forEach(r => {
            const w = r.cleanWeek;
            const action = (r.action || '').toUpperCase();

            if (action === 'JOIN' || action === 'PRESENT') {
                weekStatusMap.set(w, 'Present');
            } else {
                if (!weekStatusMap.has(w) || weekStatusMap.get(w) !== 'Present') {
                    weekStatusMap.set(w, 'Absent');
                }
            }
        });

        const explicitWeeksCount = weekStatusMap.size;
        const weeksPresent = Array.from(weekStatusMap.values()).filter(s => s === 'Present').length;

        const attendancePercentage = explicitWeeksCount > 0
            ? ((weeksPresent / explicitWeeksCount) * 100).toFixed(1)
            : 0;

        // Build Weekly Timeline
        const timeline = [];
        for (let i = 1; i <= totalWeeks; i++) {
            let status = 'No Data';
            if (weekStatusMap.has(i)) {
                status = weekStatusMap.get(i);
            }

            timeline.push({
                week: `Week ${i}`,
                status: status,
                details: null
            });
        }

        const nameData = studentName;
        const idMatch = nameData.match(/\d+/g);
        const extractedId = idMatch ? idMatch[idMatch.length - 1] : 'Unknown ID';

        return {
            name: studentName,
            id: extractedId,
            stats: {
                attendanceRate: attendancePercentage,
                totalJoins,
                avgSimilarity,
                weeksPresent: weeksPresent,
                totalWeeks: explicitWeeksCount
            },
            timeline,
            records: studentRecords
        };
    }
};
