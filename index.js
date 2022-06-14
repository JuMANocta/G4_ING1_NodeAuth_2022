// les imports
const { response } = require('express')
const express = require('express')

// instantiation de express
let app = express()

// configuration de express
app.set('view engine', 'ejs')
app.set('views', './views')

// middleware sessions
app.use(express.urlencoded({ extended: false }))
app.use(express.session({
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
    req.locals.message = ''
    if (err) req.locals.message = "<p class='msg error'>" + err + "</p>"
    if (msg) req.locals.message = "<p class='msg success'>" + msg + "</p>"
    next()
})

// mock d'un utilisateur
let users = {
    user1 : {
        name: "John"
    }
}

// quand on crée un utilisateur on génère un salt et un hash
const hash = require('pbkdf2-password')
hash({password: "user1"}, (err, pass, salt, hash) => {
    if(err) throw err
    users.user1.salt = salt
    users.user1.hash = hash
})

// gérer l'authentification de notre mock utilisateur
function authenticate(name, password, fn) {
    let login = users[name]
    if(!login) return fn(new Error('cet utilisateur n\'existe pas'))
    hash({password: password, salt: login.salt}, (err, pass, salt, hash) => {
        if(err) return fn(err)
        if(hash === login.hash){
            return fn(null, login.name)
        } else{
            return fn(new Error('mot de passe incorrect'))
        }
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