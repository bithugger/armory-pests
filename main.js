const express = require('express')
const app = express()
const fs = require('fs')
// const https = require('https')
const http = require('http')

// certificates
// const server = https.createServer({
    // cert: fs.readFileSync('certificates/fullchain.pem'),
	// key: fs.readFileSync('certificates/privkey.pem'),
	// ca: fs.readFileSync('certificates/chain.pem')
// }, app)
const server = http.createServer(app)

const io = require('socket.io')(server)

// view
app.set('view engine', 'ejs')
app.use(express.static('public'))
app.get('/', (req, res) => {
    res.render('game')
})

const ArmoryPests = require('./public/armory-pests-game.mjs').default
const game = new ArmoryPests()
const GAME_INTERVAL = 25 // ms

// require websocket connection
io.on('connection', socket => {
    console.log(socket.id + ' connected')
    
    socket.on('join', () => {
        game.addPlayer(socket.id)
    })
    
    socket.on('input', (data) => {
        setTimeout(() => {
            game.handleInput(socket.id, data)
        }, data.t - Date.now())
    })
    
    socket.on('disconnect', () => {
        console.log(socket.id + ' disconnected')
        game.removePlayer(socket.id)
    })

    setInterval(() => {
        io.volatile.emit('sync', game)
    }, GAME_INTERVAL)
})

// app.use (function (req, res, next) {
    // if (!req.secure) {
        // // request was via http, so redirect to https
        // res.redirect('https://' + req.headers.host + req.url);
    // }
    // next();
// });

server.listen(7000)

const timesyncServer = require('timesync/server');

// handle timesync requests
app.use('/timesync', timesyncServer.requestHandler);

var expected = Date.now()

function gameStep(){
    var dt = Date.now() - expected + GAME_INTERVAL
    var drift = dt - GAME_INTERVAL
    if(drift > GAME_INTERVAL){
        // TODO something?
        // game will leap forward
        expected = Date.now()
    }

    game.update(dt)

    expected += GAME_INTERVAL
    setTimeout(gameStep, Math.max(0, GAME_INTERVAL - drift))
}

expected = Date.now() + GAME_INTERVAL
setTimeout(gameStep, GAME_INTERVAL)
