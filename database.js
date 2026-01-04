/**
 * database.js
 * Simulated backend using localStorage
 */

const DB = {
    key: 'grade_calc_db',
    
    init() {
        if (!localStorage.getItem(this.key)) {
            localStorage.setItem(this.key, JSON.stringify({
                teachers: [],
                students: [], // Auth profiles for students
                records: [],  // Academic records linked to roll_no
                marks: [],    // Subject/Lab marks
                subjects: [], // Dynamic subject list
                labs: []      // Dynamic lab list
            }));
        }
    },

    getData() {
        return JSON.parse(localStorage.getItem(this.key));
    },

    saveData(data) {
        localStorage.setItem(this.key, JSON.stringify(data));
    },

    // --- Authentication ---
    signupTeacher(data) {
        const db = this.getData();
        if (db.teachers.find(t => t.email === data.email)) return { success: false, msg: 'Email already exists' };
        db.teachers.push(data);
        this.saveData(db);
        return { success: true };
    },

    loginTeacher(email, password) {
        const db = this.getData();
        const teacher = db.teachers.find(t => t.email === email && t.password === password);
        return teacher ? { success: true, user: teacher } : { success: false, msg: 'Invalid credentials' };
    },

    signupStudent(data) {
        const db = this.getData();
        if (db.students.find(s => s.rollNo === data.rollNo)) return { success: false, msg: 'Roll No already registered' };
        db.students.push(data);
        this.saveData(db);
        return { success: true };
    },

    loginStudent(rollNo, password) {
        const db = this.getData();
        const student = db.students.find(s => s.rollNo === rollNo && s.password === password);
        return student ? { success: true, user: student } : { success: false, msg: 'Invalid credentials' };
    },

    // --- Academic Record Management ---
    addStudentRecord(record) {
        const db = this.getData();
        const index = db.records.findIndex(r => r.rollNo === record.rollNo);
        
        if (index !== -1) {
            return { exists: true, index };
        }

        db.records.push(record);
        this.saveData(db);
        return { success: true };
    },

    overwriteStudentRecord(record) {
        const db = this.getData();
        const index = db.records.findIndex(r => r.rollNo === record.rollNo);
        if (index !== -1) {
            db.records[index] = record;
            // Also clear marks for this student to start fresh
            db.marks = db.marks.filter(m => m.rollNo !== record.rollNo);
            this.saveData(db);
            return { success: true };
        }
        return { success: false };
    },

    // --- Marks Management ---
    saveMarks(rollNo, marksData) {
        const db = this.getData();
        // marksData: { type: 'theory'|'lab', subject, sems: { sem1: { mid1, mid2, exam }, sem2: { mid1, mid2, exam } } }
        const key = `${rollNo}_${marksData.subject}`;
        const index = db.marks.findIndex(m => m.id === key);
        
        const preparedMark = {
            id: key,
            rollNo,
            ...marksData,
            ...this.calculateFullResult(marksData)
        };

        if (index !== -1) {
            db.marks[index] = preparedMark;
        } else {
            db.marks.push(preparedMark);
        }
        
        this.saveData(db);
    },

    calculateFullResult(m) {
        const calc = (s) => {
            if (!s) return { internal: 0, final: 0, grade: 'F' };
            const bestMid = Math.max(s.mid1 || 0, s.mid2 || 0);
            const otherMid = Math.min(s.mid1 || 0, s.mid2 || 0);
            const midAvg = (bestMid * 0.8) + (otherMid * 0.2);
            
            const internal = midAvg; // Out of 30 logic
            const exam = s.exam || 0; // Out of 70
            const total = internal + exam;
            
            let grade = 'F';
            if (total >= 90) grade = 'O';
            else if (total >= 80) grade = 'A+';
            else if (total >= 70) grade = 'A';
            else if (total >= 60) grade = 'B';
            else if (total >= 50) grade = 'C';
            else if (total >= 40) grade = 'D';

            return { internal, total, grade };
        };

        return {
            sem1Result: calc(m.sems.sem1),
            sem2Result: calc(m.sems.sem2)
        };
    },

    getStudentData(rollNo) {
        const db = this.getData();
        const record = db.records.find(r => r.rollNo === rollNo);
        const marks = db.marks.filter(m => m.rollNo === rollNo);
        return { record, marks };
    },

    getAllClassStats(branch, year, semester) {
        const db = this.getData();
        const classMarks = db.marks.filter(m => {
            const student = db.records.find(r => r.rollNo === m.rollNo);
            return student && student.branch === branch && student.year === year;
        });

        if (classMarks.length === 0) return null;

        const totals = classMarks.map(m => {
            const res = semester === '1' ? m.sem1Result : m.sem2Result;
            return res.total;
        });

        const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
        return { average: avg.toFixed(2), count: totals.length };
    }
};

DB.init();
export default DB;
