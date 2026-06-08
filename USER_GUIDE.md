# NurseSim LMS - User Guide

Welcome to the NurseSim Learning Management System. This guide provides an overview of the features available to each user profile: **Admin**, **Faculty**, and **Student**, along with common troubleshooting steps for error scenarios.

---

## 🛡️ Admin Profile

The Admin profile has full oversight of the system, responsible for managing users, approving registrations, and maintaining the structural organization of the institution.

### 1. Dashboard Overview (`/admin`)
The main dashboard provides high-level metrics including total users (students, faculty), active courses, and recent system activity.

### 2. Pending Approvals (`/admin/approvals`)
When a new Student or Faculty member registers, their account is placed in a "pending" state.
- Navigate here to review pending registrations.
- You can **Approve** or **Reject** accounts. Approved users can immediately log in and access their respective portals.

### 3. Faculty Management (`/admin/faculty`)
- View a directory of all approved faculty members.
- Review their assigned departments and designations.

### 4. Student Management & Batches (`/admin/students`)
Manage students organized by their academic batches.
- **View Batches:** See all available batches and the number of students assigned to each.
- **Create Batch:** Click the **Create Batch** button in the header. Enter the Program Name, Specialization, Start Year, and End Year to create a new batch cohort.
- **View Students:** Click into any batch to see the list of specific students, their registration numbers, and current status.

### 5. Courses (`/admin/courses`)
- View all courses created by faculty across the institution.
- Monitor course statuses (Draft, Active, Archived).

---

## 👩‍🏫 Faculty Profile

Faculty members use the platform to create educational content, track student progress, grade assignments, and manage competency checklists.

### 1. Dashboard Overview (`/faculty`)
Provides a snapshot of your active courses, total enrolled students, and pending tasks.

### 2. Create Course (`/faculty/create-course`)
- Initiate a new course by providing a title, description, and selecting the target student batches.
- Courses start in a "Draft" status until you are ready to publish them.

### 3. My Courses (`/faculty/my-courses`)
- View and manage the courses you are teaching.
- **Course Content Manager:** Click into a course to add or edit modules and lessons. You can upload videos, documents, and structure the curriculum.

### 4. Student Enrollments & Progress (`/faculty/enrollments` & `/faculty/progress`)
- **Enrollments:** See a list of all students enrolled in your courses. **Important:** Faculty must manually enroll students before students can see or join a course!
- **Progress:** Track how far along each student is within a course. Identify students who might be falling behind.

### 5. Assessments & Checklists (`/faculty/assignments`)
- **OSCE Builder:** Create standard multiple-choice question assessments.
- **Checklist Builder:** Create competency-based checklists. 
  - Add items (steps), customizable options (e.g. "Correct - 2 pts", "Incorrect - 0 pts"), and objectives.
  - Optionally enable **Peer Evaluation**, allowing approved students to evaluate each other using the checklist.
- **Checklist Management:** Click "View & Manage" on a checklist to:
  - **Approve/Reject Peer Evaluators:** Manage pending student pairing requests.
  - **View Completed Evaluations:** See scores for all evaluatees.
  - **Print Layout:** Click to print a clean paper version of the checklist for offline evaluations.
  - **Export Results:** Download a CSV file of all completed evaluations.

---

## 🎓 Student Profile

Students use the platform to consume educational content, track their learning journey, and submit coursework.

### 1. Dashboard Overview (`/student`)
Provides a quick glance at your current learning progress, academy points, and notifications.

### 2. My Courses (`/student/courses`)
- Browse the catalog of courses you are enrolled in.
- Track your overall completion percentage for each course.
- **Note:** You cannot browse all public courses. A course will only appear here after a faculty member manually enrolls you in it.

### 3. Learning Interface (`/student/courses/:id/learn`)
- Access the core learning environment for a specific course.
- Navigate through modules and lessons using the sidebar.
- Watch video lectures, read text content, and download attached lesson resources.
- Mark lessons as "Completed" to update your progress.

### 4. Assignments (`/student/assignments`)
- View a list of all pending and completed assignments across your courses.
- Upload assignment files before the due date.
- View grades and feedback from your faculty instructors once graded.

### 5. Resources (`/student/resources`)
- Access global resources, reference materials, or institutional documents shared with your batch.

---

## ⚠️ Troubleshooting & Error Scenarios

### 1. Students Cannot See Courses
- **Error Description:** A student logs in but sees "You are not enrolled in any courses yet."
- **Solution:** Students do not have self-serve enrollment. A faculty member must log into the **Faculty Portal**, navigate to **Student Enrollments**, and manually add the student to the course.

### 2. Checklist Builder Fails to Save
- **Error Description:** Faculty member clicks "Save Checklist" and an error message appears (e.g. "Failed to save checklist").
- **Solution:** 
  1. Ensure every checklist item has a description.
  2. If the error mentions missing tables, the database migration (`20260601000000_checklists.sql`) has not been applied to your Supabase instance.
  3. **Database Fix:** An admin must open the Supabase Dashboard SQL Editor, copy the contents of `supabase/migrations/20260601000000_checklists.sql`, and run it.

### 3. Cannot Export Checklist Results
- **Error Description:** Clicking "Export Results" shows "No evaluations to export".
- **Solution:** The CSV export requires at least one completed evaluation. Verify that evaluations exist before exporting.

### 4. Local Database Migration Failure (Docker Desktop)
- **Error Description:** Running `npx supabase db reset` or `supabase db push` fails with "The system cannot find the file specified" or a Docker daemon connection error.
- **Solution:** Supabase CLI local development requires Docker Desktop to be installed and running. Start Docker Desktop, wait for the engine to initialize, and try the command again. If you are exclusively using a remote database, you can run your SQL migrations directly in the remote Supabase Studio SQL editor.

### 5. Layout / Sidebar Overflow
- **Error Description:** The dashboard sidebar scrolls off the screen when the page has lots of content.
- **Solution:** This has been resolved in the UI code by fixing the layout height to `100vh` and adding independent scrolling (`overflow-y: auto`) to the main content area. Make sure your browser cache is cleared if you are still experiencing this issue.

---
*Note: All users have access to a **Profile** settings page to update their personal information, as well as a **Notifications** panel for system alerts.*
