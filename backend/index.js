const express = require('express');
const app = express();
const bcrypt = require('bcryptjs');
const db = require('./db');
const path = require('path');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const authenticateToken = require("./authmiddleware.js")
const cron = require('node-cron');

require('dotenv').config();

const port="3005"

app.use(express.json());

app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }  // Set to true in production with HTTPS
}));

app.use('/static', express.static(path.join(__dirname, 'public')));

app.get('/', /*authenticateToken,*/ (req, res) => {
  res.sendFile("/public/index.html", {"root": __dirname});
});

app.get('/login', (req, res) => {
  res.sendFile("/public/login.html", {"root": __dirname});
});

app.get('/signup', (req, res) => {
  res.sendFile("/public/signup.html", {"root": __dirname});
});


app.post('/user_signup', async (req, res) => {
    var { username, email, password } = req.body;
    const created_at = new Date()
    const hashedPassword = await bcrypt.hash(password, 10);

    const data = {
      id: null,
      username,
      email,
      password: hashedPassword,
      created_at
    }
  
    const query = 'INSERT INTO users SET ?';
    db.query(query, data, (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({ message: 'User registered successfully' });
    });
  });


  app.post("/user_login", async (req, res) => {
    console.log("hello")
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required" });
        }

        const query = 'SELECT * FROM users WHERE username = ?';
        db.query(query, [username], async (err, results) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (results.length === 0) {
                return res.status(401).json({ error: "Unregistered username" });
            }

            const response = results[0];
            const isMatch = await bcrypt.compare(password, response.password);

            if (!isMatch) {
                return res.status(401).json({ error: "Wrong password" });
            }

            const token = jwt.sign({ username: response.username }, process.env.SECRET_KEY);
            req.session.userId = results[0].id;
            res.json({ message: 'Login successful', userId: req.session.userId });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Saving a note with user ID
app.post('/notes', (req, res) => {
  const { note } = req.body;
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const sql = 'INSERT INTO notes (user_id, content) VALUES (?, ?)';
  db.query(sql, [userId, note], (err, result) => {
    if (err) throw err;
    res.json({ message: 'Note saved', noteId: result.id });
  });
});

// Fetching notes for a user
app.get('/notes', (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const sql = 'SELECT * FROM notes WHERE archived = 0 AND trashed = 0 AND user_id = ?';
  db.query(sql, [userId], (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

app.post('/notes/archive/:id', (req, res) => {
  const noteId = req.params.id;
  const sql = 'UPDATE notes SET archived = 1 WHERE id = ?';
  db.query(sql, [noteId], (err, result) => {
      if (err) return res.status(500).send(err);
      res.send('Note archived successfully');
  });
});

// Endpoint to trash a note
app.post('/notes/trash/:id', (req, res) => {
  const noteId = req.params.id;
  const trashedAt = new Date();
  const sql = 'UPDATE notes SET trashed = 1, trashed_at = ? WHERE id = ?';
  db.query(sql, [trashedAt, noteId], (err, result) => {
      if (err) return res.status(500).send(err);
      res.send('Note trashed successfully');
  });
});

// Endpoint to get all active notes
app.get('/notes', (req, res) => {
  const sql = 'SELECT * FROM notes WHERE archived = 0 AND trashed = 0';
  db.query(sql, (err, results) => {
      if (err) return res.status(500).send(err);
      res.json(results);
  });
});

// Endpoint to get archived notes
app.get('/notes/archived', (req, res) => {
  const sql = 'SELECT * FROM notes WHERE archived = 1';
  db.query(sql, (err, results) => {
      if (err) return res.status(500).send(err);
      res.json(results);
  });
});

// Endpoint to get trashed notes
app.get('/notes/trashed', (req, res) => {
  const sql = 'SELECT * FROM notes WHERE trashed = 1';
  db.query(sql, (err, results) => {
      if (err) return res.status(500).send(err);
      res.json(results);
  });
});


// Scheduled task to run daily at midnight
cron.schedule('0 0 * * *', () => {
  const sql = 'DELETE FROM notes WHERE trashed = 1 AND trashedAt < NOW() - INTERVAL 30 DAY';
  db.query(sql, (err, result) => {
      if (err) console.error('Error deleting old trashed notes:', err);
      else console.log('Old trashed notes deleted successfully');
  });
});

// Endpoint to add a tag to a note
app.post('/notes/:id/tags', (req, res) => {
  const noteId = req.params.id;
  const { tagName } = req.body;
  const userId = req.session.userId;

  if (!userId) {
      return res.status(401).send('User not logged in');
  }

  // Check if the note belongs to the user
  db.query('SELECT * FROM notes WHERE id = ? AND userid = ?', [noteId, userId], (err, results) => {
      if (err) return res.status(500).send(err);
      if (results.length === 0) return res.status(404).send('Note not found');

      // Check if the note already has 9 tags
      db.query('SELECT COUNT(*) AS tagCount FROM note_tags WHERE note_id = ?', [noteId], (err, results) => {
          if (err) return res.status(500).send(err);
          if (results[0].tagCount >= 9) return res.status(400).send('Cannot add more than 9 tags to a note');

          // Insert the tag if it doesn't exist
          db.query('INSERT IGNORE INTO tags (name) VALUES (?)', [tagName], (err, results) => {
              if (err) return res.status(500).send(err);

              // Get the tag ID
              db.query('SELECT id FROM tags WHERE name = ?', [tagName], (err, results) => {
                  if (err) return res.status(500).send(err);
                  const tagId = results[0].id;

                  // Associate the tag with the note
                  db.query('INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)', [noteId, tagId], (err, results) => {
                      if (err) return res.status(500).send(err);
                      res.send('Tag added successfully');
                  });
              });
          });
      });
  });
});

// Endpoint to fetch tags for a specific note
app.get('/notes/:id/tags', (req, res) => {
  const noteId = req.params.id;
  const userId = req.session.userId;

  if (!userId) {
      return res.status(401).send('User not logged in');
  }

  db.query(`
      SELECT tags.name
      FROM tags
      JOIN note_tags ON tags.id = note_tags.tag_id
      WHERE note_tags.note_id = ?
  `, [noteId], (err, results) => {
      if (err) return res.status(500).send(err);
      res.json(results.map(row => row.name));
  });
});




app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
