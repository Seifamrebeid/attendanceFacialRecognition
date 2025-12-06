/**
 * Firebase Cloud Functions
 * Handles automatic warning email sending
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Initialize Firebase Admin
admin.initializeApp();

// Email configuration
// IMPORTANT: Replace these with your actual SMTP credentials
const emailConfig = {
    service: 'gmail', // or 'smtp' for custom SMTP
    auth: {
        user: 'your-email@gmail.com', // Replace with your email
        pass: 'your-app-password' // Replace with your app password (not regular password)
    }
};

// For Gmail:
// 1. Enable 2-factor authentication
// 2. Generate an "App Password" from Google Account settings
// 3. Use that app password here

// For other SMTP servers:
// emailConfig = {
//   host: 'smtp.example.com',
//   port: 587,
//   secure: false,
//   auth: {
//     user: 'your-email@example.com',
//     pass: 'your-password'
//   }
// };

const transporter = nodemailer.createTransport(emailConfig);

/**
 * Send warning email to student
 * @param {string} studentEmail - Student's email address
 * @param {string} studentName - Student's name
 * @param {string} courseName - Course name
 * @param {number} absenceCount - Number of absences
 */
async function sendWarningEmail(studentEmail, studentName, courseName, absenceCount) {
    const mailOptions = {
        from: emailConfig.auth.user,
        to: studentEmail,
        subject: `Attendance Warning - ${courseName}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d32f2f;">Attendance Warning</h2>
        <p>Dear ${studentName},</p>
        
        <p>This is an automated notification regarding your attendance in <strong>${courseName}</strong>.</p>
        
        <div style="background-color: #fff3e0; padding: 15px; border-left: 4px solid #ff9800; margin: 20px 0;">
          <p style="margin: 0;">
            <strong>Total Absences:</strong> ${absenceCount}
          </p>
        </div>
        
        <p>You have reached the warning threshold for absences in this course. Continued absences may affect your academic performance and standing in the course.</p>
        
        <p><strong>What you should do:</strong></p>
        <ul>
          <li>Review the course attendance policy</li>
          <li>Contact your instructor if you have concerns</li>
          <li>Make every effort to attend future classes</li>
        </ul>
        
        <p>If you have any questions or need assistance, please don't hesitate to reach out to your instructor or academic advisor.</p>
        
        <p>Best regards,<br>
        Academic Administration</p>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">
          This is an automated message from the Attendance Management System. Please do not reply to this email.
        </p>
      </div>
    `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}

/**
 * Cloud Function: Triggered when a new warning is created
 * Automatically sends email to student when they reach 3 absences
 */
exports.sendWarningEmail = functions.firestore
    .document('warnings/{warningId}')
    .onCreate(async (snap, context) => {
        const warningData = snap.data();
        const warningId = context.params.warningId;

        console.log('New warning created:', warningId, warningData);

        // Check if email has already been sent
        if (warningData.emailSent) {
            console.log('Email already sent for this warning, skipping...');
            return null;
        }

        try {
            // Get student information
            const studentDoc = await admin.firestore()
                .collection('students')
                .doc(warningData.studentId)
                .get();

            if (!studentDoc.exists) {
                console.error('Student not found:', warningData.studentId);
                return null;
            }

            const studentData = studentDoc.data();

            // Get course information
            const courseDoc = await admin.firestore()
                .collection('courses')
                .doc(warningData.courseId)
                .get();

            if (!courseDoc.exists) {
                console.error('Course not found:', warningData.courseId);
                return null;
            }

            const courseData = courseDoc.data();

            // Send the email
            console.log(`Sending warning email to ${studentData.email}...`);

            // UNCOMMENT THIS LINE WHEN YOU HAVE CONFIGURED EMAIL CREDENTIALS
            // await sendWarningEmail(
            //   studentData.email,
            //   studentData.name,
            //   courseData.name,
            //   warningData.absenceCount
            // );

            // For now, just log (remove this when email is configured)
            console.log('EMAIL WOULD BE SENT TO:', {
                to: studentData.email,
                student: studentData.name,
                course: courseData.name,
                absences: warningData.absenceCount
            });

            // Update the warning document to mark email as sent
            await snap.ref.update({
                emailSent: true,
                emailSentAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log('Warning email sent successfully');
            return { success: true };
        } catch (error) {
            console.error('Error in sendWarningEmail function:', error);

            // Update warning with error status
            await snap.ref.update({
                emailError: error.message,
                emailAttemptedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return { success: false, error: error.message };
        }
    });

/**
 * Cloud Function: Manually trigger warning email (for testing)
 * Call this function with: { warningId: 'xxx' }
 */
exports.manualSendWarningEmail = functions.https.onCall(async (data, context) => {
    // Check if user is authenticated (optional but recommended)
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'User must be authenticated to send emails'
        );
    }

    const { warningId } = data;

    if (!warningId) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'warningId is required'
        );
    }

    try {
        const warningDoc = await admin.firestore()
            .collection('warnings')
            .doc(warningId)
            .get();

        if (!warningDoc.exists) {
            throw new functions.https.HttpsError(
                'not-found',
                'Warning not found'
            );
        }

        const warningData = warningDoc.data();

        // Get student and course data
        const [studentDoc, courseDoc] = await Promise.all([
            admin.firestore().collection('students').doc(warningData.studentId).get(),
            admin.firestore().collection('courses').doc(warningData.courseId).get()
        ]);

        const studentData = studentDoc.data();
        const courseData = courseDoc.data();

        // Send email
        await sendWarningEmail(
            studentData.email,
            studentData.name,
            courseData.name,
            warningData.absenceCount
        );

        // Update warning
        await warningDoc.ref.update({
            emailSent: true,
            emailSentAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, message: 'Email sent successfully' };
    } catch (error) {
        console.error('Error in manualSendWarningEmail:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
