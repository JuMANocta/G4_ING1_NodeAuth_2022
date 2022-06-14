// les imports
const express = require('express')
const session = require('express-session')

// instantiation de express
let app = express()

// configuration de express
app.set('view engine', 'ejs')
app.set('views', './views')

// middleware sessions
app.use(express.urlencoded({ extended: false }))
app.use(session({
    resave: false, // ne pas sauvegarder si rien n'a changé
    saveUninitialized: false, // ne pas créer de session si quelque chose est enregistré
    secret: 'matrixé' // secret pour le cryptage
}))

// middleware pour la persistence d'un message de session
app.use((req, res, next) => {
    let err = req.session.error
    let msg = req.session.success
    delete req.session.error
    delete req.session.success
    res.locals.message = ''
    if (err) res.locals.message = "<p class='msg error'>" + err + "</p>"
    if (msg) res.locals.message = "<p class='msg success'>" + msg + "</p>"
    next()
})

// mock d'un utilisateur
let users = {
    user1 : {
        name: "user1"
    }
}

// quand on crée un utilisateur on génère un salt et un hash
const hasher = require('pbkdf2-password')
let hash = hasher()
hash({password: "user1"}, (err, pass, salt, hash) => {
    if(err) throw err
    users.user1.salt = salt
    users.user1.hash = hash
})

// gérer l'authentification de notre mock utilisateur
function authenticate(name, pass, callback) {
    let login = users[name]
    if(!login) return callback(new Error('cet utilisateur n\'existe pas'))
    hash({password: pass, salt: login.salt}, (err, pass, salt, hash) => {
        if(err) return callback(err)
        if(hash === login.hash) return callback(null, login)
        return callback(new Error('mot de passe incorrect'))
    })
}

// restreint l'accès à la page
function restriction(req, res, next){
    if(req.session.user){
        next()
    }else{
        req.session.error = 'Vous devez vous connecter pour accéder à cette page'
        res.redirect('/login')
    }
}

// rootage des pages "/", "/login" , "/logout" et "/restricted"
app.get('/', (req, res) => {
    res.redirect('/login')
})

app.get('/restricted', restriction, (req, res) => {
    res.send('<h1>Vous êtes connecté</h1><br><a href="/logout">Déconnexion</a>')
})

app.get("/login", (req, res) => {
    res.render('login')
})

app.post('/login', (req, res, next) => {
    authenticate(req.body.username, req.body.password, (err, user) => {
        if(err) return next(err)
        if(user){
            // générer la session
            // regénérate un token pour la session
            req.session.regenerate(() => {
                // stocker le nom de l'utilisateur dans la session
                req.session.user = user.name
                req.session.success = 'Vous êtes connecté'
                res.redirect('/restricted')
            })
        }else{
            req.session.error = 'Identifiant ou mot de passe incorrect'
            res.redirect('/login')
        }
    })
})

app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect('/')
    })
})

app.listen(8080)