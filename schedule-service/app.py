import os
import sqlite3
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Database setup
DATABASE = 'schedules.db'

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def create_db_table():
    with get_db_connection() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS schedules (
                id INTEGER PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                due_date TEXT,
                category TEXT,
                completed BOOLEAN DEFAULT 0,
                priority TEXT DEFAULT 'medium',
                reminder_time TEXT,
                recurring TEXT DEFAULT 'none'
            )
        ''')
        conn.commit()

create_db_table()

# API Endpoints - NO JWT authentication
@app.route('/schedules', methods=['GET'])
def get_schedules():
    # Authentication is not performed here.
    # A hardcoded user_id is used for demonstration.
    current_user = "dummy_user"
    with get_db_connection() as conn:
        schedules = conn.execute('SELECT * FROM schedules WHERE user_id = ?', (current_user,)).fetchall()
    return jsonify([dict(row) for row in schedules]), 200

@app.route('/schedules', methods=['POST'])
def add_schedule():
    data = request.get_json()
    current_user = "dummy_user"
    title = data.get('title')
    description = data.get('description')
    due_date = data.get('due_date')
    category = data.get('category')
    completed = data.get('completed', False)
    priority = data.get('priority', 'medium')
    reminder_time = data.get('reminder_time', None)
    recurring = data.get('recurring', 'none')

    if not title:
        return jsonify({'message': 'Title is required'}), 400
    
    with get_db_connection() as conn:
        conn.execute('INSERT INTO schedules (user_id, title, description, due_date, category, completed, priority, reminder_time, recurring) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                     (current_user, title, description, due_date, category, completed, priority, reminder_time, recurring))
        conn.commit()
    return jsonify({'message': 'Schedule added successfully'}), 201

@app.route('/schedules/<int:schedule_id>', methods=['GET'])
def get_schedule(schedule_id):
    current_user = "dummy_user"
    with get_db_connection() as conn:
        schedule = conn.execute('SELECT * FROM schedules WHERE id = ? AND user_id = ?', (schedule_id, current_user)).fetchone()
    
    if schedule:
        return jsonify(dict(schedule)), 200
    else:
        return jsonify({'message': 'Schedule not found or not authorized'}), 404

@app.route('/schedules/<int:schedule_id>', methods=['PUT'])
def update_schedule(schedule_id):
    data = request.get_json()
    current_user = "dummy_user"

    with get_db_connection() as conn:
        schedule = conn.execute('SELECT * FROM schedules WHERE id = ? AND user_id = ?', (schedule_id, current_user)).fetchone()
        
        if not schedule:
            return jsonify({'message': 'Schedule not found or not authorized'}), 404

        title = data.get('title', schedule['title'])
        description = data.get('description', schedule['description'])
        due_date = data.get('due_date', schedule['due_date'])
        category = data.get('category', schedule['category'])
        completed = data.get('completed', schedule['completed'])
        priority = data.get('priority', schedule['priority'])
        reminder_time = data.get('reminder_time', schedule['reminder_time'])
        recurring = data.get('recurring', schedule['recurring'])

        conn.execute('UPDATE schedules SET title = ?, description = ?, due_date = ?, category = ?, completed = ?, priority = ?, reminder_time = ?, recurring = ? WHERE id = ?',
                     (title, description, due_date, category, completed, priority, reminder_time, recurring, schedule_id))
        conn.commit()
    
    return jsonify({'message': 'Schedule updated successfully'}), 200

@app.route('/schedules/<int:schedule_id>', methods=['DELETE'])
def delete_schedule(schedule_id):
    current_user = "dummy_user"

    with get_db_connection() as conn:
        cursor = conn.execute('DELETE FROM schedules WHERE id = ? AND user_id = ?', (schedule_id, current_user))
        conn.commit()
    
    if cursor.rowcount == 0:
        return jsonify({'message': 'Schedule not found or not authorized'}), 404
    else:
        return jsonify({'message': 'Schedule deleted successfully'}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
