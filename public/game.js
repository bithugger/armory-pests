import Game from './armory-pests-game.mjs'
import ParticleSystem from './particles.mjs'
import { ts } from './sync.js'
const game = new Game(true)
const particles = new ParticleSystem()

const is_mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
const COLORS = ['GhostWhite', 'Gold', 'Green', 'FireBrick', 'MidnightBlue', 'DeepPink', 'Chartreuse', 'CornflowerBlue', 'OldLace', 'Purple']
const POWERUP_LABELS = ['!', 'B+', 'S+', 'R+', 'TP', 'P', '+X', 'SH', 'K', '-1', '0', '*', ' ', '?']
var SQUARE_SIZE = Math.min(window.innerWidth/(game.arena.cols + 2 + 6), window.innerHeight/(game.arena.rows + 2))
var SCREEN_WIDTH = (game.arena.cols + 1 + 6)*SQUARE_SIZE
var SCREEN_HEIGHT = (game.arena.rows + 1)*SQUARE_SIZE
var showIntro = true
var gameReady = false

// screen shake effect
var ss_px = 0
var ss_vx = 0
var ss_py = 0
var ss_vy = 0
const SS_BX = 1/9
const SS_BY = 1/7
const SS_KX = 1/2
const SS_KY = 1/2
game.on('explode', (b) => {
    // let d = random(0, 360)*2*PI/360
    // if(b.power){
    //     ss_vx = cos(d)*b.len/30
    //     ss_vy = sin(d)*b.len/24
    // }else{
    //     ss_vx = cos(d)*b.len/60
    //     ss_vy = sin(d)*b.len/50
    // }
})

// teleport effect
game.on('teleport', (ps) => {
    let p1 = ps[0]
    let p2 = ps[1]
    let d = Math.hypot(p1.x - p2.x, p1.y - p2.y)
    for(let i = 0; i < d; i += 1){
        let s = i/d
        let x2 = p2.x + s*(p1.x - p2.x) + randomGaussian(0, 0.1)
        let y2 = p2.y + s*(p1.y - p2.y) + randomGaussian(0, 0.1)

        particles.add(x2, y2, randomGaussian(0, 0.05), randomGaussian(0, 0.05), 0.4, s*25)
    }
})

// death effect
game.on('died', (p) => {
    for(let i = 0; i < 10; i++){
        particles.add(p.x, p.y, randomGaussian(0, 2), randomGaussian(0, 2), 0.1, 25)
    }
})

// room transitions
game.on('toLobby', () => {
    particles.clear()
    ss_px = 0
    ss_py = 0
    ss_vx = 0
    ss_vy = 0
})

// local game update
const LOCAL_GAME_INTERVAL = 20 // ms
function gameStep(){
    game.update(1)
    particles.update(1)

    ss_px += ss_vx
    ss_py += ss_vy
    ss_vx -= SS_KX*ss_px + SS_BX*ss_vx
    ss_vy -= SS_KY*ss_py + SS_BY*ss_vy
}

// input delay target
const INPUT_DELAY = 30 // ms

// websocket required
const socket = io('/', {
    // disable auto-reconnect. we need more specific logic for reconnecting clients
    reconnection: false,
    // only use websockets, no http long polling
    transports: ['websocket']
})

const peer_connections = []

socket.on("connect", () => {
    // create peer with given ID
    const peer = new Peer(socket.id, {
        host: '/',
        port: 8889,
        config: {
            iceServers: [
                {
                urls: "stun:global.stun.twilio.com:3478?transport=udp"
                },
                {
                urls: "stun:stun1.l.google.com:19302"
                },
                {
                urls: "stun:openrelay.metered.ca:80",
                },
                {
                urls: "turn:openrelay.metered.ca:80",
                username: "openrelayproject",
                credential: "openrelayproject",
                },
                {
                urls: "turn:openrelay.metered.ca:443",
                username: "openrelayproject",
                credential: "openrelayproject",
                },
                {
                urls: "turn:openrelay.metered.ca:443?transport=tcp",
                username: "openrelayproject",
                credential: "openrelayproject",
                },
            ]
        }
    })

    // connected to peer server
    peer.on('open', id => {
        gameReady = true
    })

    // incoming connections
    peer.on('connection', connection => {
        connection.on('open', () => {
            peer_connections[connection.peer] = connection
        })

        connection.on('error', (err) => {
            // TODO
        })

        connection.on('data', data => {
            handlePeerData(data)
        })
    })

    function broadcast(data){
        for(const id in peer_connections){
            peer_connections[id].send(data)
        }
    }

    function handlePeerData(data){
        setTimeout(() => {
            game.handleInput(data)
        }, data.t - ts.now)
    }

    socket.on('join', id => {
        // new user joined, connect to them directly
        const connection = peer.connect(id, {
            serialization: 'binary',
            reliable: false
        })

        connection.on('open', () => {
            peer_connections[connection.peer] = connection
        })

        connection.on('error', (err) => {
            // TODO
        })

        connection.on('data', data => {
            handlePeerData(data)
        })
    })

    socket.on('sync', (data) => {
        game.deserialize(data)
    })

    socket.on('event', (e) => {
        game.trigger(e.ev, e.args)
    })

    function triggerInput(press, x){
        let input = { press: press, x: x, t: ts.now + INPUT_DELAY, player: socket.id }
        broadcast(input)
        socket.emit('input', input)
        setTimeout(() => {
            game.handleInput(input)
        }, INPUT_DELAY)
    }

    window.keyPressed = function () {
        if(showIntro){
            if(gameReady && keyCode === 32){
                showIntro = false
                socket.emit('join')
                setInterval(gameStep, LOCAL_GAME_INTERVAL)
            }
        }else{
            if(keyCode === LEFT_ARROW){
                triggerInput(true, 2)
            }else if(keyCode === RIGHT_ARROW){
                triggerInput(true, 0)
            }else if(keyCode === UP_ARROW){
                triggerInput(true, 3)
            }else if(keyCode === DOWN_ARROW){
                triggerInput(true, 1)
            }else if(keyCode === 32){ // space
                triggerInput(true, 4)
            }
        }
    }
    
    window.keyReleased = function () {
        if(keyCode === LEFT_ARROW){
            triggerInput(false, 2)
        }else if(keyCode === RIGHT_ARROW){
            triggerInput(false, 0)
        }else if(keyCode === UP_ARROW){
            triggerInput(false, 3)
        }else if(keyCode === DOWN_ARROW){
            triggerInput(false, 1)
        }else if(keyCode === 32){ // space
            triggerInput(false, 4)
        }
    }

    let touch_input_left = false
    let touch_input_right = false
    let touch_input_up = false
    let touch_input_down = false
    let touch_input_center = false
    function processTouches(tchs){
        let touch_left = false
        let touch_right = false
        let touch_up = false
        let touch_down = false
        let touch_center = false
        for(let tc of tchs){
            if(tc.y < SCREEN_HEIGHT/4){
                // up
                touch_up = true
            }else if(tc.y > 3*SCREEN_HEIGHT/4){
                // down
                touch_down = true
            }else{
                if(tc.x < SCREEN_WIDTH/4){
                    // left
                    touch_left = true
                }else if(tc.x > 3*SCREEN_WIDTH/4){
                    // right
                    touch_right = true
                }else{
                    // center
                    touch_center = true
                }
            }
        }

        // left
        if(!touch_input_left && touch_left){
            // input pressed
            triggerInput(true, 2)
        }else if(touch_input_left && !touch_left){
            // input released
            triggerInput(false, 2)
        }

        // right
        if(!touch_input_right && touch_right){
            // input pressed
            triggerInput(true, 0)
        }else if(touch_input_right && !touch_right){
            // input released
            triggerInput(false, 0)
        }

        // up
        if(!touch_input_up && touch_up){
            // input pressed
            triggerInput(true, 3)
        }else if(touch_input_up && !touch_up){
            // input released
            triggerInput(false, 3)
        }

        // down
        if(!touch_input_down && touch_down){
            // input pressed
            triggerInput(true, 1)
        }else if(touch_input_down && !touch_down){
            // input released
            triggerInput(false, 1)
        }

        // center
        if(!touch_input_center && touch_center){
            // input pressed
            triggerInput(true, 4)
        }else if(touch_input_center && !touch_center){
            // input released
            triggerInput(false, 4)
        }

        touch_input_left = touch_left
        touch_input_right = touch_right
        touch_input_up = touch_up
        touch_input_down = touch_down
        touch_input_center = touch_center
    }

    /* prevents the mobile browser from processing some default
    * touch events, like swiping left for "back" or scrolling
    * the page. */
    window.touchStarted = function (){
        if(is_mobile && touches.length > 0){
            if(showIntro){
                if(gameReady){
                    showIntro = false
                    socket.emit('join')
                    setInterval(gameStep, LOCAL_GAME_INTERVAL)
                }
            }else{
                processTouches(touches)
            }
        }
        return false
    }

    window.touchMoved = function (){
        processTouches(touches)
        return false
    }

    window.touchEnded = function (){
        processTouches(touches)
        return false
    }

    setTimeout(() => {
        ts.ping()
        socket.emit('ping')
    }, 200)

    socket.on('pong', st => {
        ts.correct(st)
        setTimeout(() => {
            ts.ping()
            socket.emit('ping')
        }, ts.interval)
    })

    socket.io.on('close', () => {
        peer.disconnect()
        gameReady = false
        showIntro = true
    })
})

window.preload = function () {
	window.gameFont = loadFont('font.ttf');
}

window.windowResized = function () {
    SQUARE_SIZE = Math.min(window.innerWidth/(game.arena.cols + 2 + 6), window.innerHeight/(game.arena.rows + 2))
    SCREEN_WIDTH = (game.arena.cols + 1 + 6)*SQUARE_SIZE
    SCREEN_HEIGHT = (game.arena.rows + 1)*SQUARE_SIZE
    resizeCanvas(SCREEN_WIDTH, SCREEN_HEIGHT)
}

window.setup = function (){
    createCanvas(SCREEN_WIDTH, SCREEN_HEIGHT)
	textFont(window.gameFont)

    frameRate(60)
}

window.draw = function (){
    if(showIntro){
        drawIntro()
    }else if(game.state == 0){
        drawLobby()        
    }else{
        drawPlaying()
    }
}

function drawPlayer(p){
    push()

    if(p.invis_time > 0){
        if(game.all_players[socket.id] == p.color){
            noFill()
        }else{
            pop()
            return
        }
    }else{
        fill(color(COLORS[p.color]))
    }
    translate(p.x, p.y)

    if(p.reverse_time > 0){
        rotate(PI)
    }
    circle(0, -1/4, 1/4)
    triangle(0, 2/5, -1/4, -1/40, 1/4, -1/40)

    if(p.bomb_kick){
        circle(-1/5, 2/5, 1/10)
        circle(1/5, 2/5, 1/10)
    }

    if(p.shield_time > 0){
        noFill()
        stroke(255)
        strokeWeight(1/20)
        let r = 1 - 0.1*Math.cos((250/p.shield_time - p.shield_time/50)*2*Math.PI)
        circle(0, 0, r)
    }

    if(p.poop_time > 0){
        fill(60, 30, 10)
        noStroke()
        circle(0, 1/8, 1/6)
    }

    pop()
}


function drawBomb(b){
    push()
    fill(230)
    translate(b.x, b.y)
    if(b.state == 0){
        let r = 0.45 + 0.05*Math.cos(b.time*2*Math.PI/20)
        beginShape()
        for(let i = 0; i < b.num; i++){
            vertex(r*cos(i*2*PI/b.num), r*sin(i*2*PI/b.num))
        }
        endShape(CLOSE)

        if(b.power){
            fill(100)
            noStroke()
            arc(0,0, 2/5, 2/5, PI/3, PI*2/3, PIE)
            arc(0,0, 2/5, 2/5, PI, PI*4/3, PIE)
            arc(0,0, 2/5, 2/5, PI*5/3, PI*2, PIE)
            
            fill(230)
            circle(0,0, 1/6)
            fill(100)
            circle(0,0, 1/9)
        }
    }else if(b.state == 1){
        let r = 0.25 - 0.25*Math.cos(b.time*Math.PI/24)
        beginShape()
        for(let i = 0; i < b.num; i++){
            vertex(r*cos(i*2*PI/b.num), r*sin(i*2*PI/b.num))
        }
        endShape(CLOSE)
    }
    pop()
}

function drawExplosion(e){
    particles.add(e.x, e.y, randomGaussian(0, 1), randomGaussian(0, 1), 0.2, 15)
    push()
    rectMode(CENTER)
    if(e.power){
        fill(100)
    }else{
        fill(255)
    }
    let tail_len = Math.min(Math.max(e.max_len - e.len, 0), 1)
    translate(e.x, e.y)

    rotate(e.dir*Math.PI/4)
    let size = Math.tanh(e.len)*3/4
    scale(size)
    quad(2/5, 0, 1/10, 1/2, -(2/5+tail_len), 0, 1/10, -1/2)
    pop()
}

function drawBlock(b){
    push()
    rectMode(CENTER)
    fill(230)
    translate(b.x, b.y)
    rect(0, 0, 9/10)
    pop()
}

function drawPowerUp(p) {
    push()
    fill(55)
    rectMode(CENTER)
    translate(p.x, p.y)
    rect(0, 0, 3/5)

    textAlign(CENTER, CENTER)
    textSize(1/3)
    fill(255)
    let label = POWERUP_LABELS[p.label]
    text(label, 0, 0)

    pop()
}

function drawWall(w) {
    push()
    rectMode(CENTER)
    fill(0)
    translate(w.x, w.y)
    rect(0, 0, 1)
    pop()
}

function drawIce(x) {
    push()
    stroke(110)
    translate(x.x, x.y)
    for(let i = -3/8; i < 1/2; i += 1/4){
        line(i, -1/2, -1/2, i)
        line(i, 1/2, 1/2, i)

        line(-1/2, i, -i, 1/2)
        line(1/2, i, -i, -1/2)
    }
    pop()
}

function drawMud(x) {
    push()
    noStroke()
    fill(50)
    translate(x.x, x.y)
    for(let i = -3/8; i < 1/2; i += 1/4){
        for(let j = -3/8; j < 1/2; j += 1/4){
            circle(j, i, 1/20)
        }
    }
    pop()
}

function drawFire(x) {
    push()
    rectMode(CENTER)
    let r = (Math.cos(frameCount/23)+1)*20 + 200
    let g = (Math.cos(frameCount/23)+1)*20 + 40
    let b = (Math.cos(frameCount/23)+1)*10 + 20
    fill(color(r, g, b))
    translate(x.x, x.y)
    rect(0, 0, 9/10)
    pop()
}

function drawTeleporter(x) {
    push()
    rectMode(CENTER)
    if(x.disabled){
        fill(100)
    }else{
        let r = (Math.cos(frameCount/30)+1)*20 + 150
        let g = (Math.cos(frameCount/30)+1)*20 + 40
        let b = (Math.cos(frameCount/30)+1)*20 + 200
        fill(color(r, g, b))
    }
    translate(x.x1, x.y1)
    rect(0, 0, 7/8)
    fill(150)
    noStroke()
    rect(0, 0, 3/8)
    pop()

    push()
    rectMode(CENTER)
    if(x.disabled){
        fill(100)
    }else{
        let r = (Math.cos(frameCount/30)+1)*20 + 150
        let g = (Math.cos(frameCount/30)+1)*20 + 40
        let b = (Math.cos(frameCount/30)+1)*20 + 200
        fill(color(r, g, b))
    }
    translate(x.x2, x.y2)
    rect(0, 0, 7/8)
    fill(150)
    noStroke()
    rect(0, 0, 3/8)
    pop()
}

function drawObjects(m){
    push()
    stroke(60)
    strokeWeight(1/30)
    scale(SQUARE_SIZE)

    // screen shake effect
    translate(ss_px, ss_py)

    m.ices.forEach((x) => {
        drawIce(x)
    })
    m.muds.forEach((x) => {
        drawMud(x)
    })
    m.teleporters.forEach((x) => {
        drawTeleporter(x)
    })
    m.fires.forEach((x) => {
        drawFire(x)
    })
    m.blocks.forEach((b) => {
        drawBlock(b)
    })
    m.walls.forEach((w) => {
        drawWall(w)
    })
    m.powerups.forEach((p) => {
        drawPowerUp(p)
    })
    particles.draw()
    m.players.forEach((p) => {
        p.live_bombs.forEach((b) => {
            drawBomb(b)
        })
        drawPlayer(p)
    })
    m.explosions.forEach((e) => {
        drawExplosion(e)
    })
    pop()
}

function drawLobbyInfo(m){
    push()
    stroke(60)
    strokeWeight(1/30)
    scale(SQUARE_SIZE)

    // screen shake effect
    translate(ss_px, ss_py)

    fill(200)
    textSize(1/2)
    drawPowerUp({x: m.cols + 2, y: 1, label: 1})
    text('Bombs Up', m.cols + 3, 1.1)

    drawPowerUp({x: m.cols + 2, y: 2, label: 3})
    text('Range Up', m.cols + 3, 2.1)

    drawPowerUp({x: m.cols + 2, y: 3, label: 2})
    text('Speed Up', m.cols + 3, 3.1)

    drawPowerUp({x: m.cols + 2, y: 4, label: 8})
    text('Bomb Kick', m.cols + 3, 4.1)

    drawPowerUp({x: m.cols + 2, y: 5, label: 5})
    text('Piercing', m.cols + 3, 5.1)

    drawPowerUp({x: m.cols + 2, y: 6, label: 6})
    text('Diagonal', m.cols + 3, 6.1)

    drawPowerUp({x: m.cols + 2, y: 7, label: 12})
    text('Invisible', m.cols + 3, 7.1)

    drawPowerUp({x: m.cols + 2, y: 8, label: 7})
    text('Shield', m.cols + 3, 8.1)

    drawPowerUp({x: m.cols + 2, y: 9, label: 4})
    text('Teleport', m.cols + 3, 9.1)

    drawPowerUp({x: m.cols + 2, y: 10, label: 13})
    text('Random', m.cols + 3, 10.1)

    drawPowerUp({x: m.cols + 2, y: 11, label: 0})
    text('Curse', m.cols + 3, 11.1)

    drawFire({x: m.cols + 2, y: 12})
    text('Death', m.cols + 3, 12.1)

    drawTeleporter({x1: m.cols + 2, y1: 13, x2: m.cols + 2, y2: 13, disabled: false})
    text('Warp', m.cols + 3, 13.1)

    pop()
}

function drawIntro(){
    background(0)

    push()
    fill(200)
    scale(SQUARE_SIZE)
    translate(3, 0)
    strokeWeight(1/20)
    textSize(2)
    textAlign(CENTER, CENTER)
    text('Armory Pests', game.arena.cols/2, game.arena.rows/2 - 1)
    textSize(2/3)
    text('a game by wavy', game.arena.cols/2, game.arena.rows/2 + 1)
    if(gameReady){
        textSize(1)
        if(is_mobile){
            text('Touch to Play', game.arena.cols/2, game.arena.rows/2 + 2)
        }else{
            text('Press Space to Play', game.arena.cols/2, game.arena.rows/2 + 2)
        }
    }
    pop()
}

function drawScores(m){
    m.players.forEach((p) => {
        let s = 0
        for(let id in game.all_players){
            // TODO cannot directly compare instances. why?
            if(game.all_players[id] == p.color){
                s = game.scores[id]
            }
        }

        // draw
        push()
        scale(SQUARE_SIZE)
        translate(p.x, p.y)
        fill(0)
        noStroke()
        textAlign(CENTER)
        if(s > 9){
            textSize(1/4.5)
        }else{
            textSize(1/4)
        }
        text(s, 0, 1/6)
        pop()
    })
}

function drawLobby(){
    background(0)

    push()
    stroke(120)
    scale(SQUARE_SIZE)
    strokeWeight(1/20)
    line(1/2, 1/2, game.lobby.cols + 1/2, 1/2)
    line(1/2, game.lobby.rows + 1/2, game.lobby.cols + 1/2, game.lobby.rows + 1/2)
    line(1/2, 1/2, 1/2, game.lobby.rows + 1/2)
    line(game.lobby.cols + 1/2, 1/2, game.lobby.cols + 1/2, game.lobby.rows + 1/2)
    
    line(1/2, 3.5, game.lobby.cols + 1/2, 3.5)

    textAlign(CENTER, CENTER)
    strokeWeight(0)
    fill(100)
    textSize(1)
    if(game.lobby.players.length > 1){
        text('Move here to start', 9, 2)
    }else{
        text('Waiting for players', 9, 2)
    }
    textSize(2)
    text('Lobby', 9, 8)
    textSize(2/3)
    if(is_mobile){
        text('Touch screen edges to move', 9, 9.5)
        text('Touch screen center to bomb', 9, 10.2)
    }else{
        text('Move with arrow keys', 9, 9.5)
        text('Bomb with space', 9, 10.2)
    }
    pop()

    drawLobbyInfo(game.lobby)

    drawObjects(game.lobby)

    drawScores(game.lobby)
}

function drawPlaying(){
    background(0)
    translate(3*SQUARE_SIZE, 0)

    push()
    scale(SQUARE_SIZE)
    fill(150)
    rect(0, 0, game.arena.cols + 1, game.arena.rows + 1)
    stroke(120)
    strokeWeight(1/30)
    for(let i = 0; i <= game.arena.rows; i++){
        line(1/2, i + 0.5, game.arena.cols + 1/2, i + 0.5)
    }
    
    for(let j = 0; j <= game.arena.cols; j++){
        line(j + 0.5, 1/2, j + 0.5, game.arena.rows + 1/2)
    }
    pop()
    
    drawObjects(game.arena)
    
    if(game.state == 2){
        push()
        scale(SQUARE_SIZE)
        strokeWeight(1/20)
        textSize(2)
        textAlign(CENTER, CENTER)
        rectMode(CENTER)
        fill(color(250, 200))
        rect(game.arena.cols/2 + 1, game.arena.rows/2, game.arena.cols + 2, 3)
        fill(0)
        text('GAME SET', game.arena.cols/2, game.arena.rows/2)
        pop()
    }
}