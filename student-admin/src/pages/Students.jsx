import { useState } from 'react'

function Students() {
  const [students] = useState([
    {
      id: 1,
      name: 'Ahmed Ali',
      enrollmentId: 'STU001',
      email: 'ahmed@school.edu',
      class: '10-A',
      joinDate: '2024-09-01',
    },
    {
      id: 2,
      name: 'Fatima Hassan',
      enrollmentId: 'STU002',
      email: 'fatima@school.edu',
      class: '10-B',
      joinDate: '2024-09-01',
    },
    {
      id: 3,
      name: 'Mohamed Karim',
      enrollmentId: 'STU003',
      email: 'mohamed@school.edu',
      class: '10-A',
      joinDate: '2024-09-01',
    },
  ])

  const [searchTerm, setSearchTerm] = useState('')

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.enrollmentId.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div>
      <div className="page-header">
        <h2>Students Management</h2>
        <p>Manage and view all enrolled students</p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <input
            type="text"
            placeholder="Search by name or enrollment ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '0.75rem',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              flex: 1,
              marginRight: '1rem',
              fontSize: '0.9rem',
            }}
          />
          <button className="btn btn-primary">Add Student</button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Enrollment ID</th>
                <th>Email</th>
                <th>Class</th>
                <th>Join Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td>{student.name}</td>
                  <td>{student.enrollmentId}</td>
                  <td>{student.email}</td>
                  <td>{student.class}</td>
                  <td>{student.joinDate}</td>
                  <td>
                    <button className="btn btn-sm" style={{ marginRight: '0.5rem' }}>
                      Edit
                    </button>
                    <button className="btn btn-sm btn-danger">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Students
