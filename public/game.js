import Game from './armory-pests-game.mjs'
import ParticleSystem from './particles.mjs'
const game = new Game(true)
const particles = new ParticleSystem()

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
const SS_KX = 1/3
const SS_KY = 1/3
game.on('explode', (b) => {
    let d = random(0, 360)*2*PI/360
    if(b.power){
        ss_vx = cos(d)*b.len/15
        ss_vy = sin(d)*b.len/12
    }else{
        ss_vx = cos(d)*b.len/55
        ss_vy = sin(d)*b.len/44
    }
})

// teleport effect
game.on('teleport', (ps) => {
    let p1 = ps[0]
    let p2 = ps[1]
    let d = Math.hypot(p1.x - p2.x, p1.y - p2.y)
    for(let i = 0; i < d; i += 0.5){
        let s = i/d
        let x2 = p2.x + s*(p1.x - p2.x)
        let y2 = p2.y + s*(p1.y - p2.y)

        particles.add(x2, y2, randomGaussian(0, 0.1), randomGaussian(0, 0.1), 0.4, s*500)
    }
})

// death effect
game.on('died', (p) => {
    for(let i = 0; i < 20; i++){
        particles.add(p.x, p.y, randomGaussian(0, 2), randomGaussian(0, 2), 0.1, 500)
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
    game.update(LOCAL_GAME_INTERVAL)
    particles.update(LOCAL_GAME_INTERVAL)

    ss_px += ss_vx
    ss_py += ss_vy
    ss_vx -= SS_KX*ss_px + SS_BX*ss_vx
    ss_vy -= SS_KY*ss_py + SS_BY*ss_vy
}

// input delay target
const INPUT_DELAY = 40 // ms

// create a timesync instance
var ts = timesync.create({
    server: '/timesync',
    interval: 5000
});

// websocket required
const socket = io('/')

socket.on("connect", () => {
    gameReady = true

    socket.on('sync', (data) => {
        game.sync(data)
    })
    
    window.keyPressed = function () {
        if(showIntro){
            if(keyCode === 32){
                showIntro = false
                socket.emit('join')
                setInterval(gameStep, LOCAL_GAME_INTERVAL)
            }
        }else{
            if(keyCode === LEFT_ARROW){
                socket.emit('input', {press: true, x: 2, t: ts.now() + INPUT_DELAY})
                setTimeout(() => {
                    game.handleInput(socket.id, {press: true, x: 2})
                }, INPUT_DELAY - ts.offset)
            }else if(keyCode === RIGHT_ARROW){
                socket.emit('input', {press: true, x: 0, t: ts.now() + INPUT_DELAY})
                setTimeout(() => {
                    game.handleInput(socket.id, {press: true, x: 0})
                }, INPUT_DELAY - ts.offset)
            }else if(keyCode === UP_ARROW){
                socket.emit('input', {press: true, x: 3, t: ts.now() + INPUT_DELAY})
                setTimeout(() => {
                    game.handleInput(socket.id, {press: true, x: 3})
                }, INPUT_DELAY - ts.offset)
            }else if(keyCode === DOWN_ARROW){
                socket.emit('input', {press: true, x: 1, t: ts.now() + INPUT_DELAY})
                setTimeout(() => {
                    game.handleInput(socket.id, {press: true, x: 1})
                }, INPUT_DELAY - ts.offset)
            }else if(keyCode === 32){ // space
                socket.emit('input', {press: true, x: 4, t: ts.now() + INPUT_DELAY})
                setTimeout(() => {
                    game.handleInput(socket.id, {press: true, x: 4})
                }, INPUT_DELAY - ts.offset)
            }
        }
    }
    
    window.keyReleased = function () {
        if(keyCode === LEFT_ARROW){
            socket.emit('input', {press: false, x: 2, t: ts.now() + INPUT_DELAY})
            setTimeout(() => {
                game.handleInput(socket.id, {press: false, x: 2})
            }, INPUT_DELAY - ts.offset)
        }else if(keyCode === RIGHT_ARROW){
            socket.emit('input', {press: false, x: 0, t: ts.now() + INPUT_DELAY})
            setTimeout(() => {
                game.handleInput(socket.id, {press: false, x: 0})
            }, INPUT_DELAY - ts.offset)
        }else if(keyCode === UP_ARROW){
            socket.emit('input', {press: false, x: 3, t: ts.now() + INPUT_DELAY})
            setTimeout(() => {
                game.handleInput(socket.id, {press: false, x: 3})
            }, INPUT_DELAY - ts.offset)
        }else if(keyCode === DOWN_ARROW){
            socket.emit('input', {press: false, x: 1, t: ts.now() + INPUT_DELAY})
            setTimeout(() => {
                game.handleInput(socket.id, {press: false, x: 1})
            }, INPUT_DELAY - ts.offset)
        }else if(keyCode === 32){ // space
            socket.emit('input', {press: false, x: 4, t: ts.now() + INPUT_DELAY})
            setTimeout(() => {
                game.handleInput(socket.id, {press: false, x: 4})
            }, INPUT_DELAY - ts.offset)
        }
    }
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
    }else if(game.state == 'wait'){
        drawLobby()        
    }else{
        drawPlaying()
    }
}

function drawPlayer(p){
    push()

    if(p.invis_time > 0){
        if(game.all_players[socket.id].color == p.color){
            noFill()
        }else{
            pop()
            return
        }
    }else{
        fill(color(p.color))
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
        let r = 1 - 0.1*Math.cos((5000/p.shield_time - p.shield_time/1000)*2*Math.PI)
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
    if(b.state == 'ticking'){
        let r = 0.45 + 0.05*Math.cos(b.time*2*Math.PI/1000)
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
    }else if(b.state == 'exploding'){
        let r = 0.25 - 0.25*Math.cos(b.time*2*Math.PI/500)
        beginShape()
        for(let i = 0; i < b.num; i++){
            vertex(r*cos(i*2*PI/b.num), r*sin(i*2*PI/b.num))
        }
        endShape(CLOSE)
    }
    pop()
}

function drawExplosion(e){
    particles.add(e.x, e.y, randomGaussian(0, 1), randomGaussian(0, 1), 0.2, 300)
    push()
    rectMode(CENTER)
    if(e.power){
        fill(100)
    }else{
        fill(255)
    }
    let tail_len = Math.min(Math.max(e.max_len - e.len, 0), 1)
    translate(e.x, e.y)

    rotate(e.dir*Math.PI/180)
    let size = Math.tanh(e.len)
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

    textSize(1/3)
    fill(255);
    if(p.label.length == 1){
        text(p.label, -1/10, 1/8);
    }else{
        text(p.label, -1/5, 1/8);
    }

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
    textSize(1/3)
    drawPowerUp({x: m.cols + 2, y: 1, label: 'B+'})
    text('Bombs Up', m.cols + 3, 1.1)

    drawPowerUp({x: m.cols + 2, y: 2, label: 'R+'})
    text('Range Up', m.cols + 3, 2.1)

    drawPowerUp({x: m.cols + 2, y: 3, label: 'S+'})
    text('Speed Up', m.cols + 3, 3.1)

    drawPowerUp({x: m.cols + 2, y: 4, label: 'K'})
    text('Bomb Kick', m.cols + 3, 4.1)

    drawPowerUp({x: m.cols + 2, y: 5, label: 'P'})
    text('Piercing', m.cols + 3, 5.1)

    drawPowerUp({x: m.cols + 2, y: 6, label: '8'})
    text('8 Way', m.cols + 3, 6.1)

    drawPowerUp({x: m.cols + 2, y: 7, label: ' '})
    text('Invisible', m.cols + 3, 7.1)

    drawPowerUp({x: m.cols + 2, y: 8, label: 'SH'})
    text('Shield', m.cols + 3, 8.1)

    drawPowerUp({x: m.cols + 2, y: 9, label: 'TP'})
    text('Teleport', m.cols + 3, 9.1)

    drawPowerUp({x: m.cols + 2, y: 10, label: '?'})
    text('Random', m.cols + 3, 10.1)

    drawPowerUp({x: m.cols + 2, y: 11, label: '!'})
    text('Curse', m.cols + 3, 11.1)

    drawFire({x: m.cols + 2, y: 12})
    text('Death', m.cols + 3, 12.1)

    drawTeleporter({x1: m.cols + 2, y1: 13, x2: m.cols + 2, y2: 13, disabled: false})
    text('Warp', m.cols + 3, 13.1)

    pop()
}

function drawIntro(){
    background(0)

    stroke(200)
    scale(SQUARE_SIZE)
    translate(3, 0)
    strokeWeight(1/20)
    textSize(1)
    text('Armory Pests', (game.arena.cols*2/7), (game.arena.rows/2))
    textSize(1/3)
    text('a game by wavy', 7, 7)
    if(gameReady){
        textSize(1/2)
        text('Press Space to Play', (game.arena.cols/3), 8)
    }
}

function drawScores(m){
    m.players.forEach((p) => {
        let s = 0
        for(let id in game.all_players){
            // TODO cannot directly compare instances. why?
            if(game.all_players[id].color == p.color){
                s = game.scores[id]
            }
        }

        // draw
        push()
        scale(SQUARE_SIZE)
        translate(p.x, p.y)
        fill(0)
        noStroke()
        if(s > 9){
            textSize(1/5.5)
            text(s, -1/10, 1/6)
        }else{
            textSize(1/5)
            text(s, -1/15, 1/6)
        }
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

    textSize(1/2)
    if(game.lobby.players.length > 1){
        text('Move here to start', 6, 2.25)
    }else{
        text('Waiting for players', 6, 2.25)
    }
    textSize(1)
    text('Lobby', 7.25, 8)
    textSize(1/2)
    text('Move with arrow keys', 5.75, 9)
    text('Bomb with space', 6.5, 9.5)
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
    
    if(game.state == 'endgame'){
        push()
        scale(SQUARE_SIZE)
        strokeWeight(1/20)
        textSize(1)
        rectMode(CENTER)
        fill(color(250, 200))
        rect(game.arena.cols/2 + 1, game.arena.rows/2, game.arena.cols + 2, 3)
        fill(0)
        text('GAME SET', (game.arena.cols*3/8), game.arena.rows/2 + 1/4)
        pop()
    }
}