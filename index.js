const express = require('express')
const app = express()
const port = 3000
const moment = require('moment')
const path = require('path')
const db = require ('./connection/db') // get connection script
const bcrypt = require('bcrypt')
const session = require('express-session')
const flash = require('express-flash')
const upload = require('./middlewares/upload-file') 
const fs = require('fs')
const PATH = 'http://localhost:3000/'
const deletePath = 'uploads/'

app.set('view engine', 'hbs')
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.static(path.join(__dirname, 'uploads')))
app.use(express.urlencoded({extended: true}))
app.use(session({
  secret: 'rahasia',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 60 * 60 * 2 }
}))
app.use(flash())

// Testing connection database
db.connect((err, _, done) => {
  if (err) {
      return console.log(err);
  }
  console.log('Connection Database success');
  done()
})

// Routes
app.get('/', (req, res) => {
  db.connect((err, client, done) => {
    if (err) throw err
    let query = `
    SELECT tb_project.*, tb_user.name AS user_name, tb_user.email
    FROM tb_project LEFT JOIN tb_user
    ON tb_project.user_id=tb_user.id
      `
    if (req.session.isLogin == true) {
      query = `
      SELECT tb_project.*, tb_user.name AS user_name, tb_user.email
      FROM tb_project LEFT JOIN tb_user
      ON tb_project.user_id=tb_user.id
      WHERE tb_project.user_id=${req.session.user.id}
      `
    }
    client.query(query, (err, result) => {
      done()
      if (err) throw err
      let data = result.rows
      data = data.map((project) => {
        if (project.technologies) {
          if (project.technologies.includes('nodejs')) {
            project.nodejs = true
          }
          if (project.technologies.includes('nextjs')) {
            project.nextjs = true
          }
          if (project.technologies.includes('reactjs')) {
            project.reactjs = true
          }
          if (project.technologies.includes('typescript')) {
            project.typescript = true
          }
        }
        project.image = PATH + project.image
        project.duration = getDuration(project.start_date, project.end_date)
        return project
      })
      res.render('index', {projects: data, user: req.session.user, isLogin: req.session.isLogin})
    })
  })
})

// Register
app.get('/register', (req, res) => {
  if (req.session.isLogin == true) {
    req.flash('error', 'You already logged in')
    return res.redirect('/')
  }
  res.render('register')
})
app.post('/register', (req, res) => {
  const { name, email, password } = req.body
  if (name == '' || email == '' || password == '') {
    req.flash('error', 'All fields must be filled')
    return res.redirect('/register')
  }
  const hash = bcrypt.hashSync(password, 10)
  db.connect((err, client, done) => {
    if (err) throw err
    const query = `
      INSERT INTO tb_user(name, email, password)
      VALUES ('${name}', '${email}', '${hash}')
    `
    client.query(query, (err) => {
      done()
      if (err) {
        console.log(err);
        req.flash('error', `Email ${email} already exist`)
        return res.redirect('/register')
      }
      req.flash('success', 'Register success, please login')
      res.redirect('/login')
    })
  })
})

// Login
app.get('/login', (req, res) => {
  if (req.session.isLogin == true) {
    req.flash('error', 'You already logged in')
    return res.redirect('/')
  }
  res.render('login')
})
app.post('/login', (req, res) => {
  const { email, password } = req.body
  if (email == '' || password == '') {
    req.flash('error', 'All fields must be filled')
    return res.redirect('/login')
  }
  db.connect((err, client, done) => {
    if (err) throw err
    const query = `
      SELECT * FROM tb_user WHERE email='${email}'
    `
    client.query(query, (err, result) => {
      done()
      if (err) throw err
      const data = result.rows
      
      // check email
      if (data.length == 0) {
        req.flash('error', `Email ${email} not found`)
        return res.redirect('/login')
      }

      // check password
      const user = data[0]
      const isMatch = bcrypt.compareSync(password, user.password)
      if (isMatch == false) {
        req.flash('error', 'Wrong password')
        return res.redirect('/login')
      }

      // store data to session
      req.session.isLogin = true
      req.session.user = {
        id: user.id,
        email: user.email,
        name: user.name
      }
      res.redirect('/')
    })
  })
})

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy()
  res.redirect('/')
})

// Project detail
app.get('/project/:id', (req, res) => {
  db.connect((err, client, done) => {
    if (err) throw err
    client.query(`SELECT * FROM tb_project WHERE id=${req.params.id}`, (err, result) => {
      done()
      if (err) throw err
      let data = result.rows
      data = data.map((project) => {
        if (project.technologies) {
          if (project.technologies.includes('nodejs')) {
            project.nodejs = true
          }
          if (project.technologies.includes('nextjs')) {
            project.nextjs = true
          }
          if (project.technologies.includes('reactjs')) {
            project.reactjs = true
          }
          if (project.technologies.includes('typescript')) {
            project.typescript = true
          }
        }
        project.image = PATH + project.image
        project.duration = getDuration(project.start_date, project.end_date)
        project.start_date = moment(project.start_date).locale('id').format('ll')
        project.end_date = moment(project.end_date).locale('id').format('ll')
        return project
      })
      res.render('project-detail', {project: data[0]})
    })
  })
})

// Add project
app.get('/add-project', (req, res) => {
  if (req.session.isLogin != true) {
    req.flash('error', 'Please login to add a project')
    return res.redirect('/login')
  }
  res.render('add-project', {user: req.session.user, isLogin: req.session.isLogin})
})
app.post('/add-project', upload.single('image'), (req, res) => {
  const { name, start_date, end_date, description, technologies } = req.body
  const image = req.file.filename
  const user_id = req.session.user.id
  db.connect((err, client, done) => {
    if (err) throw err
    const query = `
      INSERT INTO tb_project(name, start_date, end_date, description, technologies, image, user_id)
      VALUES ('${name}', '${start_date}', '${end_date}', '${description}', '{${technologies}}', '${image}', '${user_id}')
    `
    client.query(query, (err) => {
      done()
      if (err) throw err
      res.redirect('/')
    })
  })
})

// edit project form
app.get('/edit-project/:id', (req, res) => {
  if (req.session.isLogin != true) {
    req.flash('error', 'Please login to edit a project')
    return res.redirect('/login')
  }
  const id = req.params.id
  db.connect((err, client, done) => {
    if (err) throw err
    const query = `SELECT * FROM tb_project WHERE id=${id}`
    client.query(query, (err, result) => {
      done()
      if (err) throw err
      let project = result.rows[0]
      if (project.user_id != req.session.user.id) {
        req.flash('error', 'Cannot edit project of another user')
        return res.redirect('/')
      }
      if (project.technologies) {
        if (project.technologies.includes('nodejs')) {
          project.nodejs = true
        }
        if (project.technologies.includes('nextjs')) {
          project.nextjs = true
        }
        if (project.technologies.includes('reactjs')) {
          project.reactjs = true
        }
        if (project.technologies.includes('typescript')) {
          project.typescript = true
        }
      }
      project.image = PATH + project.image
      project.start_date = project.start_date.toISOString().substring(0, 10),
      project.end_date = project.end_date.toISOString().substring(0, 10),        
      res.render('edit-project', {project: project})
    })
  })
})
app.post('/edit-project/:id', upload.single('image'), (req, res) => {
  if (req.session.isLogin != true) {
    req.flash('error', 'Please login to edit the project')
    return res.redirect('/login')
  }
  const id = req.params.id
  const {name, start_date, end_date, description, technologies} = req.body
  const user_id = req.session.user.id
  db.connect((err, client, done) => {
    if (err) throw err
    const querySelect = `
    SELECT image FROM tb_project WHERE id=${id}
    `
    client.query(querySelect, (err, result) => {
      if (err) throw err
      let image = result.rows[0].image
      if (req.file) {
        fs.rm(deletePath + image, (err) => {
          if (err) throw err
        })
        image = req.file.filename
      }
      const queryUpdate = `
      UPDATE tb_project
      SET name='${name}', start_date='${start_date}', end_date='${end_date}', description='${description}', technologies='{${technologies}}', image='${image}', user_id='${user_id}'
      WHERE id=${id}
      `
      client.query(queryUpdate, (err) => {
        done()
        if (err) throw err
        res.redirect('/')
      })
    })
  })
})

// delete project from db
app.get('/delete-project/:id', (req, res) => {
  if (req.session.isLogin != true) {
    req.flash('error', 'Please login to delete the project')
    return res.redirect('/login')
  }
  const id = req.params.id
    db.connect ((err, client, done) => {
      if (err) throw err
      const querySelect = `
        SELECT * FROM tb_project
        WHERE user_id=${req.session.user.id}
      `
      const queryDelete = `
        DELETE FROM tb_project
        WHERE id=${id};
      `
      client.query(querySelect, (err, result) => {
        if (err) throw err
        const project = result.rows[0]
        const image = project.image
        if (project.user_id != req.session.user.id) {
          req.flash('error', 'Cannot delete project of another user')
          return res.redirect('/')
        }
        client.query(queryDelete, (err) => {
          done()
          if (err) throw err
          fs.rm(deletePath + image, (err) => {
            if (err) throw err
          })
          res.redirect('/')
        })
      })
    })
})

app.get('/contact', (req, res) => {
  res.render('contact')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

function getDuration(startDate, endDate) {
  const a = moment(endDate)
  const b = moment(startDate)

  let month = a.diff(b, 'month');
  let duration = '';

  if (month == 12) {
    duration = '1 tahun';
  } else if (month > 12) {
    let year = a.diff(b, 'year');
    month %= 12; // calculate exceeding month
    if (month == 0) {
      duration = `${year} tahun`;
    } else {
      duration = `${year} tahun ${month} bulan`;
    }
  } else {
    duration = `${month} bulan`
    if (month < 1) {
      let day = a.diff(b, 'day');
      duration = `${day} hari`;
    }
  }
  return duration
}