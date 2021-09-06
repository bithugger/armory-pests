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

const ArmoryPests = require('./armory-pests-game').default
const game = new ArmoryPests()
const GAME_INTERVAL = 20 // ms

// require websocket connection
io.on('connection', socket => {
    console.log(socket.id + ' connected')
    
    socket.on('join', () => {
        game.addPlayer(socket.id)
    })
    
    socket.on('input', (data) => {
        socket.volatile.broadcast.emit('input', data)

        setTimeout(() => {
            game.handleInput(socket.id, data)
        }, data.t - Date.now())
    })
    
    socket.on('disconnect', () => {
        console.log(socket.id + ' disconnected')
        game.removePlayer(socket.id)
    })

    setInterval(() => {
        io.volatile.emit('sync', JSON.stringify(game))
    }, 3*GAME_INTERVAL)
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


function gameStep(){
    game.update(GAME_INTERVAL)
}

setInterval(gameStep, GAME_INTERVAL)
