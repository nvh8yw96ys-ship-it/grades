// ============================================================================
//  Grade Ledger: course data from the Fall 2026 syllabi (edit here)
//  w = weight in % of the course grade · total = number of graded items
//  (leave total out when the syllabus doesn't say how many there are)
// ============================================================================
const DATA = {
  TERM: "Fall 2026",
  SCALE: [[90, "A", 4], [80, "B", 3], [70, "C", 2], [60, "D", 1], [-Infinity, "F", 0]],
  COURSES: [
    { id: "pete219", code: "PETE 219", sec: "501", crn: "46288", hrs: 2, name: "Foundations of Petroleum Data Analytics",
      cats: [
        { id: "lab", name: "Laboratory reports", w: 25, total: 12 },
        { id: "quiz", name: "Daily quizzes", w: 5 },
        { id: "part", name: "Participation & professionalism", w: 5, total: 1 },
        { id: "ex1", name: "Exam 1", w: 25, total: 1 },
        { id: "proj1", name: "Project 1", w: 10, total: 1 },
        { id: "ex2", name: "Exam 2", w: 30, total: 1 },
      ],
      notes: ["A curve may be applied depending on exam difficulty.", "A C or better requires every assignment submitted and each one above 70%.", "More than 4 unexcused lecture absences is an automatic F."] },
    { id: "pete301", code: "PETE 301", sec: "502", crn: "12321", hrs: 3, name: "Petroleum Numerical Methods",
      cats: [
        { id: "lab", name: "Lab average", w: 25, total: 10 },
        { id: "exam", name: "Term exams", sub: "3 exams, equal weight", w: 60, total: 3 },
        { id: "proj", name: "Final project", sub: "Cumulative · due Thu Dec 10, 11:59 pm", w: 15, total: 1 },
      ],
      notes: ["Weights confirmed 2026-11-14: labs 25%, term exams 60%, final project 15%.", "Late labs get a zero unless excused."] },
    { id: "pete310", code: "PETE 310", sec: "501", crn: "12324", hrs: 3, name: "Reservoir Fluids",
      cats: [
        { id: "exam", name: "Exams I–III", sub: "25% each, averaged together", w: 75, total: 3 },
        { id: "hw", name: "Homework", w: 10 },
        { id: "lab", name: "Lab attendance & lab reports", w: 15 },
      ],
      notes: ["The final is optional. If you take it, it is averaged in with the three midterms: add it as a fourth exam and set the exam total to 4.", "Late homework and lab work lose 10% per day."] },
    { id: "pete314", code: "PETE 314", sec: "501", crn: "", hrs: 3, name: "Transport Processes in Petroleum Production",
      cats: [
        { id: "mt1", name: "Midterm exam 1", w: 30, total: 1 },
        { id: "mt2", name: "Midterm exam 2", w: 30, total: 1 },
        { id: "final", name: "Final exam", sub: "Comprehensive · Mon Dec 7, 3–5 pm, RICH 101", w: 40, total: 1 },
      ],
      notes: ["Makeup exams (excused absences only): Dec 1 for Midterm 1, Dec 3 for Midterm 2.", "Course grades are not rounded up."] },
    { id: "geol404", code: "GEOL 404", sec: "501", crn: "11456", hrs: 3, name: "Geology of Petroleum",
      cats: [
        { id: "mt1", name: "Midterm I", w: 25, total: 1 },
        { id: "mt2", name: "Midterm II", w: 25, total: 1 },
        { id: "labwork", name: "Lab: quizzes & lab work", sub: "70% of the 35% lab grade", w: 24.5 },
        { id: "labproj", name: "Lab: team final project", sub: "30% of the 35% lab grade", w: 10.5, total: 1 },
        { id: "hw", name: "Homework, in-class exercises & participation", w: 10 },
        { id: "att", name: "Attendance", w: 5, total: 1 },
      ],
      notes: ["Letter cutoffs: A above 90, B 80–89.99, C 70–79.99, D 60–69.99.", "Late labs receive a zero but must still be submitted."] },
  ],
};
