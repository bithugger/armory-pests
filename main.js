const express = require('express')
const app = express()
const fs = require('fs')
// const https = require('https')
const http = require('http')
const { PeerServer } = require('peer')

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

const ArmoryPests = require('./armory-pests-game').default
const game = new ArmoryPests()
const GAME_INTERVAL = 20 // ms

// require websocket connection
io.on('connection', socket => {
    console.log(socket.id + ' connected')
    
    socket.on('join', () => {
        game.addPlayer(socket.id)
        socket.broadcast.emit('join', socket.id)
        io.volatile.emit('sync', game.serialize())
    })
    
    socket.on('input', (data) => {
        setTimeout(() => {
            game.handleInput(data)
        }, data.t - Date.now())
    })
    
    socket.on('disconnect', () => {
        console.log(socket.id + ' disconnected')
        game.removePlayer(socket.id)
        io.volatile.emit('sync', game.serialize())
    })

    socket.on('ping', () => {
        socket.emit('pong', Date.now())
    })

    setInterval(() => {
        io.volatile.emit('sync', game.serialize())
    }, 4*GAME_INTERVAL)

    game.addEventDispatcher((e) => {
        io.emit('event', e)
    })
})

// app.use (function (req, res, next) {
    // if (!req.secure) {
        // // request was via http, so redirect to https
        // res.redirect('https://' + req.headers.host + req.url);
    // }
    // next();
// });

server.listen(8888)

const peerServer = PeerServer({
    port: 8889
})

function gameStep(){
    game.update(1)
}

setInterval(gameStep, GAME_INTERVAL)
