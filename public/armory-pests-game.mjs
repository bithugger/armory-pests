class Avatar {
    constructor(x, y, c){
        this.x = x
        this.y = y
        this.color = c
        
        // stats
        this.max_spd = 2.5
        this.max_bombs = 1
        this.bomb_len = 2
        this.bomb_spd = 10
        this.bomb_fuse = 3000
        this.bomb_split = 4
        this.bomb_power = false
        this.bomb_kick = false
        this.shield_time = 0
        this.reverse_time = 0
        this.poop_time = 0
        this.invis_time = 0

        // modifiers
        this.slowed = false
        
        // internal fields
        this.spd = 0
        this.spd_sp = 0
        this.dirs = []
        this.blocked_up = false
        this.blocked_down = false
        this.blocked_left = false
        this.blocked_right = false
        this.last_dir = 0
        this.slide_dir = -1
        this.live_bombs = []
    }

    get direction(){
        if(this.slide_dir >= 0){
            return this.slide_dir
        }else{
            var dir = this.last_dir
            if(this.dirs.length > 1){
                var d1 = this.dirs[this.dirs.length - 2]
                var d2 = this.dirs[this.dirs.length - 1]
                if((this.blocked_right && d1 == 0) || (this.blocked_left && d1 == 180) 
                    || (this.blocked_down && d1 == 90) || (this.blocked_up && d1 == 270)){
                    dir = d2
                }else{
                    dir = d1
                }
            }else if(this.dirs.length > 0){
                dir = this.dirs[this.dirs.length - 1]
            }
            if(this.reverse_time > 0){
                dir = (dir + 180) % 360
            }

            return dir
        }
    }

    update(dt){
        var d1 = this.direction
        var dir = d1*Math.PI/180
        var spd_err = this.spd_sp - this.spd;
        var spd = this.spd + Math.sign(spd_err)*Math.min(Math.abs(spd_err), this.max_spd/3)
        spd = Math.max(Math.min(spd, this.max_spd), 0)
        spd = Math.min(spd, 7.5)
        if(this.slowed){
            spd = Math.min(spd, 2.5)
        }
        
        if((this.blocked_right && d1 == 0) || (this.blocked_left && d1 == 180) 
            || (this.blocked_down && d1 == 90) || (this.blocked_up && d1 == 270)){
            this.spd = 0
        }else{
            this.spd = spd
            this.x += Math.cos(dir)*spd*dt/1000
            this.y += Math.sin(dir)*spd*dt/1000;
        }

        for(var i = this.live_bombs.length - 1; i >= 0; i--){
            if(this.live_bombs[i].state == 'dead'){
                delete this.live_bombs[i]
                this.live_bombs.splice(i, 1)
            }
        }

        if(this.shield_time > 0){
            this.shield_time -= dt
        }

        if(this.reverse_time > 0){
            this.reverse_time -= dt
        }

        if(this.poop_time > 0){
            this.poop_time -= dt
        }

        if(this.invis_time > 0){
            this.invis_time -= dt
        }
    }
}

class Bomb {
    constructor(x, y, spd, time, len, num, power){
        this.x = x
        this.y = y
        this.spd = spd
        this.time = time
        this.state = 'ticking'
        this.num = num
        this.len = len
        this.size = 30
        this.intangible = true
        this.power = power
        this.vx = 0
        this.vy = 0

        this.slowed = false

        this.blocked_up = false
        this.blocked_down = false
        this.blocked_left = false
        this.blocked_right = false
    }

    update(dt){
        this.time -= dt
        if(this.time <= 0){
            if(this.state == 'exploding'){
                this.state = 'dead'
            }
        }

        if(this.blocked_up){
            this.vy = Math.max(0, this.vy)
        }
        if(this.blocked_down){
            this.vy = Math.min(0, this.vy)
        }
        if(this.blocked_left){
            this.vx = Math.max(0, this.vx)
        }
        if(this.blocked_right){
            this.vx = Math.min(0, this.vx)
        }

        this.x += this.vx*dt/1000
        this.y += this.vy*dt/1000

        if(this.slowed){
            this.vx -= this.vx*dt/50
            this.vy -= this.vy*dt/50
        }else{
            this.vx -= this.vx*dt/1000
            this.vy -= this.vy*dt/1000
        }
    }
}

class Explosion {
    constructor(x, y, spd, dir, len, power){
        this.x = x
        this.y = y
        this.spd = spd
        this.dir = dir
        this.len = len
        this.max_len = len
        this.power = power
    }

    update(dt){
        var dir = this.dir*Math.PI/180;
        var dx = Math.cos(dir)*this.spd*dt/1000
        var dy = Math.sin(dir)*this.spd*dt/1000
        this.x += dx
        this.y += dy
        this.len -= Math.hypot(dx, dy)
    }
}

class Block {
    constructor(x, y){
        this.x = x
        this.y = y
    }

    update(dt){

    }
}

class Powerup {
    constructor(x, y, type, label){
        this.x = x
        this.y = y
        this.type = type
        this.label = label
        this.indestructable_time = 1000
    }

    update(dt){
        if(this.indestructable_time > 0){
            this.indestructable_time -= dt
        }
    }
}

class Wall {
    constructor(x, y){
        this.x = x
        this.y = y
    }

    update(dt){

    }
}

/* no speed up */
class Ice {
    constructor(x, y){
        this.x = x
        this.y = y
    }

    update(dt){

    }
}

/* no bomb kick */
class Mud {
    constructor(x, y){
        this.x = x
        this.y = y
    }

    update(dt){

    }
}

/* kills players */
class Fire {
    constructor(x, y){
        this.x = x
        this.y = y
    }

    update(dt){

    }
}

/* teleports players (and bombs and explosions..?) */
class Teleporter {
    constructor(x1, y1, x2, y2){
        this.x1 = x1
        this.y1 = y1
        this.x2 = x2
        this.y2 = y2
        this.already_teleported = []
        this.disabled = false
    }

    update(dt){

    }
}

class RoomManager {
    constructor(rows, cols, client = false){
        this.players = []
        this.explosions = []
        this.blocks = []
        this.walls = []
        this.powerups = []
        this.ices = []
        this.muds = []
        this.fires = []
        this.teleporters = []
        this.rows = rows
        this.cols = cols
        this.client = client
        this.cbq = []
    }

    fireEvent(ev, args){
        if(!this.client){
            this.cbq.push({'ev': ev, 'args': args})
        }
    }
    
    update(dt){
        this.players.forEach((p) => {
            p.update(dt)
            p.live_bombs.forEach((b) => {
                b.update(dt)

                if(b.time <= 0 && b.state == 'ticking'){
                    this.explode(b)
                }
            })

            if(p.poop_time > 0){
                this.dropBomb(p)
            }
        })
        this.explosions.forEach((e) => {
            e.update(dt)
        })
        this.blocks.forEach((b) => {
            b.update(dt)
        })
        this.walls.forEach((w) => {
            w.update(dt)
        })
        this.powerups.forEach((p) => {
            p.update(dt)
        })
        this.ices.forEach((x) => {
            x.update(dt)
        })
        this.muds.forEach((x) => {
            x.update(dt)
        })
        this.fires.forEach((x) => {
            x.update(dt)
        })
        this.teleporters.forEach((x) => {
            x.update(dt)
        })
        
        this.checkCollisions(dt)
    }

    dropBomb(p){
        if(p.live_bombs.length < p.max_bombs){
            var bomb_x = Math.round(p.x)
            var bomb_y = Math.round(p.y)
            var es = this.getEntitiesAt(bomb_x, bomb_y)
            var okay = true
            es.forEach((e) => {
                okay &= !(e instanceof Wall)
                okay &= !(e instanceof Block)
                okay &= !(e instanceof Bomb)
            })
            if(okay){
                var bomb = new Bomb(bomb_x, bomb_y, p.bomb_spd, p.bomb_fuse, p.bomb_len, p.bomb_split, p.bomb_power)
                p.live_bombs.push(bomb)
            }
        }
    }

    explode(b){
        b.state = 'exploding'
        b.time = 250
        this.createExplosions(b.x, b.y, b.spd, b.num, b.len, b.power)
        this.fireEvent('explode', b)
    }

    pickUpPower(player, power){
        if(power.type == 'B+'){
            player.max_bombs += 1
        }else if(power.type == 'S+'){
            player.max_spd += 1
        }else if(power.type == 'R+'){
            player.bomb_len += 1
        }else if(power.type == 'TP'){
            if(!this.client && this.players.length > 1){
                var tpi = this.players.indexOf(player)
                var opi = Math.floor(Math.random()*(this.players.length - 1))
                if(opi >= tpi){
                    opi += 1
                }
                var x2 = Math.round(this.players[opi].x)
                var y2 = Math.round(this.players[opi].y)
                player.x = x2
                player.y = y2
                this.players[opi].x = power.x
                this.players[opi].y = power.y
                this.fireEvent('teleport', [player, this.players[opi]])
            }
        }else if(power.type == 'PB'){
            player.bomb_power = true
        }else if(power.type == '8B'){
            player.bomb_split = 8
        }else if(power.type == 'SH'){
            player.shield_time += 10000
        }else if(power.type == 'K'){
            player.bomb_kick = true
        }else if(power.type == '-1'){
            player.reverse_time = 10000
        }else if(power.type == '!'){
            player.poop_time = 9000
        }else if(power.type == '*'){
            player.max_bombs = 8
            player.max_spd = 7.5
            player.bomb_len = 10
            player.bomb_kick = true
            player.bomb_split = 8
            player.bomb_power = true
        }else if(power.type == '0'){
            player.max_bombs = 1
            player.max_spd = 2.5
            player.bomb_len = 2
            player.bomb_kick = false
            player.bomb_split = 4
            player.bomb_power = false
            player.shield_time = 0
        }else if(power.type == ' '){
            player.invis_time = 10000
        }
    }

    reconcileBombBlockCollision(b, k){
        if(Math.abs(k.x - b.x) < 1 && Math.abs(k.y - b.y) < 1){
            var dx = k.x - b.x
            var dy = k.y - b.y
            if(Math.hypot(k.x - b.x, k.y - b.y) <= 1.2){
                // straight on collision, process normally
                if(Math.abs(dx) > Math.abs(dy)){
                    if(dx > 0){
                        b.blocked_right = true
                    }else{
                        b.blocked_left = true
                    }
                    b.x = Math.round(b.x)
                    b.vx = 0
                }else if(Math.abs(dx) < Math.abs(dy)){
                    if(dy > 0){
                        b.blocked_down = true
                    }else{
                        b.blocked_up = true
                    }
                    b.y = Math.round(b.y)
                    b.vy = 0
                }
            }else{
                // corner collision, slide past
                // this should never happen since it is a bomb
                if(abs(b.vx) > 0.001){
                    b.y = Math.round(b.y)
                }
                if(abs(b.vy) > 0.001){
                    b.x = Math.round(b.x)
                }
            }
        }
    }

    reconcilePlayerBlockCollision(p, b){
        var dx = b.x - p.x
        var dy = b.y - p.y
        if(Math.abs(dx) < 0.9 && Math.abs(dy) < 0.9){
            if(Math.hypot(dx, dy) < 0.925){
                // straight on collision, process normally
                if(Math.abs(dx) > Math.abs(dy)){
                    if(dx > 0){
                        p.blocked_right = true
                    }else{
                        p.blocked_left = true
                    }
                }else{
                    if(dy > 0){
                        p.blocked_down = true
                    }else{
                        p.blocked_up = true
                    }
                }
            }else{
                // corner collision, slide past if able
                var adjx = Math.round(p.x)
                var adjy = Math.round(p.y)
                if(p.direction == 0 && p.x <= this.cols - 1){
                    var es = this.getEntitiesAt(adjx + 1, adjy)
                    var adj_clear = true
                    es.forEach((e) => {
                        adj_clear &= !(e instanceof Block) && !(e instanceof Wall) && !(e instanceof Bomb)
                    })

                    if(adj_clear && adjy > p.y && adjy <= this.rows){
                        p.slide_dir = 90
                    }else if(adj_clear && adjy < p.y && adjy >= 1){
                        p.slide_dir = 270
                    }
                    p.blocked_right = true
                    
                }else if(p.direction == 90 && p.y <= this.rows - 1){
                    var es = this.getEntitiesAt(adjx, adjy + 1)
                    var adj_clear = true
                    es.forEach((e) => {
                        adj_clear &= !(e instanceof Block) && !(e instanceof Wall) && !(e instanceof Bomb)
                    })
                    
                    if(adj_clear && adjx > p.x && adjx <= this.cols){
                        p.slide_dir = 0
                    }else if(adj_clear && adjx < p.x && adjx >= 1){
                        p.slide_dir = 180
                    }
                    p.blocked_down = true
                    
                }else if(p.direction == 180 && p.x >= 2){
                    var es = this.getEntitiesAt(adjx - 1, adjy)
                    var adj_clear = true
                    es.forEach((e) => {
                        adj_clear &= !(e instanceof Block) && !(e instanceof Wall) && !(e instanceof Bomb)
                    })
                    
                    if(adj_clear && adjy > p.y && adjy <= this.rows){
                        p.slide_dir = 90
                    }else if(adj_clear && adjy < p.y && adjy >= 1){
                        p.slide_dir = 270
                    }
                    p.blocked_left = true
                    
                }else if(p.direction == 270 && p.y >= 2){
                    var es = this.getEntitiesAt(adjx, adjy - 1)
                    var adj_clear = true
                    es.forEach((e) => {
                        adj_clear &= !(e instanceof Block) && !(e instanceof Wall) && !(e instanceof Bomb)
                    })
                    
                    if(adj_clear && adjx > p.x && adjx <= this.cols){
                        p.slide_dir = 0
                    }else if(adj_clear && adjx < p.x && adjx >= 1){
                        p.slide_dir = 180
                    }
                    p.blocked_up = true

                }
            }
        }
    }

    reconcilePlayerBombCollision(p, b, own_bomb){
        var on_bomb = false
        if(Math.hypot(b.x - p.x, b.y - p.y) < 1){
            on_bomb = true
            if(!(b.intangible && own_bomb)){
                // straight on collision, process normally
                var dx = b.x - p.x
                var dy = b.y - p.y
                if(Math.abs(dx) > Math.abs(dy)){
                    if(dx > 0){
                        p.blocked_right = true
                        if(!b.slowed && p.bomb_kick && p.direction == 0 && p.spd > 0){
                            b.vx = p.spd + 3
                        }else{
                            b.vx = 0
                        }
                    }else{
                        p.blocked_left = true
                        if(!b.slowed && p.bomb_kick && p.direction == 180 && p.spd > 0){
                            b.vx = -(p.spd + 3)
                        }else{
                            b.vx = 0
                        }
                    }
                }else{
                    if(dy > 0){
                        p.blocked_down = true
                        if(!b.slowed && p.bomb_kick && p.direction == 90 && p.spd > 0){
                            b.vy = p.spd + 3
                        }else{
                            b.vy = 0
                        }
                    }else{
                        p.blocked_up = true
                        if(!b.slowed && p.bomb_kick && p.direction == 270 && p.spd > 0){
                            b.vy = -(p.spd + 3)
                        }else{
                            b.vy = 0
                        }
                    }
                }
            }
        }
        if(own_bomb){
            b.intangible &= on_bomb
        }
    }

    checkCollisions(dt){
        // explosions on walls
        for(var i = this.explosions.length - 1; i >= 0; i--){
            for(var j = this.walls.length - 1; j >= 0; j--){
                var d = Math.hypot(this.walls[j].x - this.explosions[i].x, this.walls[j].y - this.explosions[i].y)
                if(d < 0.5){
                    this.explosions.splice(i, 1)
                    break;
                }
            }
        }
            
        // explosions on blocks
        for(var i = this.explosions.length - 1; i >= 0; i--){
            for(var j = this.blocks.length - 1; j >= 0; j--){
                var d = Math.hypot(this.blocks[j].x - this.explosions[i].x, this.blocks[j].y - this.explosions[i].y)
                if(d < 0.5){
                    if(!this.explosions[i].power){
                        this.explosions.splice(i, 1)
                    }
                    if(!this.client && Math.random()*10 < 4){
                        this.createPowerUp(this.blocks[j].x, this.blocks[j].y)
                    }else if(!this.client && Math.random()*100 < 5){
                        this.createFire(this.blocks[j].x, this.blocks[j].y)
                    }
                    this.blocks.splice(j, 1)
                    break;
                }
            }
        }
        
        // explosions on powerups
        for(var i = this.explosions.length - 1; i >= 0; i--){
            for(var j = this.powerups.length - 1; j >= 0; j--){
                var d = Math.hypot(this.powerups[j].x - this.explosions[i].x, this.powerups[j].y - this.explosions[i].y)
                if(d < 0.33 && this.powerups[j].indestructable_time <= 0){
                    this.powerups.splice(j, 1)
                    if(!this.explosions[i].power){
                        this.explosions.splice(i, 1)
                        break
                    }
                }
            }
        }
        
        // explosions on players
        for(var i = this.explosions.length - 1; i >= 0; i--){
            for(var j = this.players.length - 1; j >= 0; j--){
                var d = Math.hypot(this.players[j].x - this.explosions[i].x, this.players[j].y - this.explosions[i].y)
                if(d < 0.33 && this.players[j].shield_time <= 0){
                    this.players[j].live_bombs.forEach((b) => {
                        if(b.state == 'ticking'){
                            this.explode(b)
                        }
                    })
                    this.fireEvent('died', this.players[j])
                    this.players.splice(j, 1)
                }
            }
        }
        
        // players and bombs
        this.players.forEach((p) => {

            p.blocked_right = false
            p.blocked_left = false
            p.blocked_up = false
            p.blocked_down = false
            
            // explosions on bombs
            for(var i = p.live_bombs.length - 1; i >= 0; i--){
                for(var j = 0; j < this.explosions.length; j++){
                    if(p.live_bombs[i].state == 'ticking'){
                        var d = Math.hypot(this.explosions[j].x - p.live_bombs[i].x, this.explosions[j].y - p.live_bombs[i].y)
                        if(d < 0.5){
                            this.explode(p.live_bombs[i])
                        }
                    }
                }
            }
            
            // players on bombs
            p.live_bombs.forEach((b) => {
                this.reconcilePlayerBombCollision(p, b, true)
                p.live_bombs.forEach((b2) => {
                    if(b != b2){
                        this.reconcileBombBlockCollision(b, b2)
                    }
                })
            })
            this.players.forEach((p2) => {
                p2.live_bombs.forEach((b) => {
                    if(p != p2){
                        this.reconcilePlayerBombCollision(p, b, false)
                        p.live_bombs.forEach((b2) => {
                            this.reconcileBombBlockCollision(b, b2)
                        })
                    }
                    b.blocked_up = false
                    b.blocked_down = false
                    b.blocked_left = false
                    b.blocked_right = false
                    this.blocks.forEach((k) => {
                        this.reconcileBombBlockCollision(b, k)
                    })
                    this.walls.forEach((k) => {
                        this.reconcileBombBlockCollision(b, k)
                    })
                })
            })
            
            // players pickup powerups
            for(var i = this.powerups.length - 1; i >= 0; i--){
                var d = Math.hypot(p.x - this.powerups[i].x, p.y - this.powerups[i].y)
                if(d < 0.5){
                    this.pickUpPower(p, this.powerups[i])
                    this.powerups.splice(i, 1)
                }
            }
            
            // players out of bounds
            if(p.x < 1){
                p.blocked_left = true
                p.x = Math.max(p.x, 1)
                if(p.direction == 180){
                    p.spd = 0
                }
            }
            if(p.x > this.cols){
                p.blocked_right = true
                p.x = Math.min(p.x, this.cols)
                if(p.direction == 0){
                    p.spd = 0
                }
            }
            if(p.y < 1){
                p.blocked_up = true
                p.y = Math.max(p.y, 1)
                if(p.direction == 270){
                    p.spd = 0
                }
            }
            if(p.y > this.rows){
                p.blocked_down = true
                p.y = Math.min(p.y, this.rows)
                if(p.direction == 90){
                    p.spd = 0
                }
            }
            
            // bombs out of bounds
            p.live_bombs.forEach((b) => {
                if((b.x < 1) || (b.x > this.cols)){
                    b.vx = 0
                    b.x = Math.max(b.x, 1)
                    b.x = Math.min(b.x, this.cols)
                }
                if((b.y < 1) || (b.y > this.rows)){
                    b.vy = 0
                    b.y = Math.max(b.y, 1)
                    b.y = Math.min(b.y, this.rows)
                }
            })
        })

        // players on blocks and walls
        this.players.forEach((p) => {
            p.slide_dir = -1
            this.blocks.forEach((b) => {
                this.reconcilePlayerBlockCollision(p, b)
            })

            this.walls.forEach((w) => {
                this.reconcilePlayerBlockCollision(p, w)
            })
        })

        // players on ice terrain
        this.players.forEach((p) => {
            p.slowed = false
            this.ices.forEach((x) => {
                if(Math.hypot(p.x - x.x, p.y - x.y) < 0.717){
                    p.slowed = true
                }
            })
        })

        // bombs on mud terrain
        this.players.forEach((p) => {
            p.live_bombs.forEach((b) => {
                b.slowed = false
                this.muds.forEach((x) => {
                    if(Math.hypot(b.x - x.x, b.y - x.y) <= 0.5){
                        b.slowed = true
                    }
                })
            })
        })

        // players on fire terrain
        for(var j = this.players.length - 1; j >= 0; j--){
            this.fires.forEach((x) => {
                if(Math.hypot(this.players[j].x - x.x, this.players[j].y - x.y) < 0.5){
                    this.players[j].live_bombs.forEach((b) => {
                        if(b.state == 'ticking'){
                            this.explode(b)
                        }
                    })
                    this.fireEvent('died', this.players[j])
                    this.players.splice(j, 1)
                }
            })
        }

        // players on teleporters
        // only perform teleport logic server side
        if(!this.client){
            this.teleporters.forEach((x) => {
                this.walls.forEach((w) => {
                    if(Math.hypot(x.x1 - w.x, x.y1 - w.y) < 0.1 || Math.hypot(x.x2 - w.x, x.y2 - w.y) < 0.1){
                        x.disabled = true
                    }
                })

                this.players.forEach((p) => {
                    let ati = x.already_teleported.indexOf(p)
                    if(ati < 0 && !x.disabled){
                        if(Math.hypot(p.x - x.x1, p.y - x.y1) < 0.2){
                            let delta_x = p.x - x.x1
                            let delta_y = p.y - x.y1
                            p.x = x.x2 + delta_x
                            p.y = x.y2 + delta_y

                            this.fireEvent('teleport', [{x: x.x2 + delta_x, y: x.y2 + delta_y}, {x: x.x1 + delta_x, y: x.y1 + delta_y}])
                            x.already_teleported.push(p)
                        }else if(Math.hypot(p.x - x.x2, p.y - x.y2) < 0.2){
                            let delta_x = p.x - x.x2
                            let delta_y = p.y - x.y2
                            p.x = x.x1 + delta_x
                            p.y = x.y1 + delta_y

                            this.fireEvent('teleport', [{x: x.x1 + delta_x, y: x.y1 + delta_y}, {x: x.x2 + delta_x, y: x.y2 + delta_y}])
                            x.already_teleported.push(p)
                        }
                    }
                })
                
                for(let i = x.already_teleported.length - 1; i >= 0; i--){
                    let z = x.already_teleported[i]
                    if(Math.hypot(z.x - x.x1, z.y - x.y1) > 0.717 && Math.hypot(z.x - x.x2, z.y - x.y2) > 0.717){
                        x.already_teleported.splice(i, 1)
                    }
                }
            })
        }
        
        // clear dead explosions and explosions out of bounds
        for(var i = this.explosions.length - 1; i >= 0; i--){
            if(this.explosions[i].x < 0 || this.explosions[i].y < 0 
                || this.explosions[i].x > this.cols + 1 || this.explosions[i].y > this.rows + 1
                || this.explosions[i].len < 0){

                this.explosions.splice(i, 1)
            }
        }
    }

    createExplosions(x, y, spd, num, len, power){
        for(var i = 0; i < num; i++){
            var dir = 360/num*i
            var explosion = new Explosion(x, y, spd, dir, len, power)
            this.explosions.push(explosion)
        }
    }

    createBlock(x, y){
        var block = new Block(x, y)
        this.blocks.push(block)
        return block
    }

    createWall(x, y){
        var wall = new Wall(x, y)
        this.walls.push(wall)
        return wall
    }

    createIce(x, y){
        var ice = new Ice(x, y)
        this.ices.push(ice)
        return ice
    }

    createMud(x, y){
        var mud = new Mud(x, y)
        this.muds.push(mud)
        return mud
    }

    createFire(x, y){
        var fire = new Fire(x, y)
        this.fires.push(fire)
        return fire
    }

    createTeleporter(x1, y1, x2, y2){
        var teleporter = new Teleporter(x1, y1, x2, y2)
        this.teleporters.push(teleporter)
        // remove blocks next to teleporter
        for(var i = this.blocks.length - 1; i >= 0; i--){
            var d = Math.hypot(this.blocks[i].x - teleporter.x1, this.blocks[i].y - teleporter.y1)
            if(d < 2){
                this.blocks.splice(i,1)
            }else{
                d = Math.hypot(this.blocks[i].x - teleporter.x2, this.blocks[i].y - teleporter.y2)
                if(d < 2){
                    this.blocks.splice(i,1)
                }
            }
        }
        return teleporter
    }

    createPowerUp(x, y, type = 'random'){
        var label = type
        if(type == 'random'){
            var r = Math.floor(Math.random()*35)
            if(r >= 0 && r < 6){
                type = 'B+'
                label = 'B+'
            }else if(r >= 6 && r < 12){
                type = 'R+'
                label = 'R+'
            }else if(r >= 12 && r < 18){
                type = 'S+'
                label = 'S+'
            }else if(r >= 18 && r < 20){
                type = 'K'
                label = 'K'
            }else if(r >= 20 && r < 22){
                type = 'PB'
                label = 'PB'
            }else if(r >= 22 && r < 24){
                type = '8B'
                label = '8B'
            }else if(r >= 24 && r < 27){
                type = 'SH'
                label = 'SH'
            }else if(r >= 27 && r < 29){
                type = ' '
                label = ' '
            }else if(r >= 29 && r < 31){
                type = '-1'
                label = '!'
            }else if(r >= 31 && r < 33){
                type = '!'
                label = '!'
            }else if(r >= 33 && r < 34){
                type = '0'
                label = '!'
            }else if(r >= 34 && r < 35){
                type = 'TP'
                label = 'TP'
            }

            if(Math.random()*5 < 1){
                label = '?'
                if(type != '0' && Math.floor(Math.random()*20) < 1){
                    type = '*'
                }
            }
        }

        var pup = new Powerup(x, y, type, label)
        this.powerups.push(pup)
        return pup
    }

    addPlayer(player){
        this.players.push(player)
        // remove blocks next to player
        for(var i = this.blocks.length - 1; i >= 0; i--){
            var d = Math.hypot(this.blocks[i].x - player.x, this.blocks[i].y - player.y)
            if(d < 2){
                this.blocks.splice(i,1)
            }
        }
    }

    getEntitiesAt(x, y){
        var e = []
        this.explosions.forEach((s) => {
            if(Math.hypot(x - s.x, y - s.y) < 0.5){
                e.push(x)
            }
        })
        this.powerups.forEach((p) => {
            if(Math.hypot(x - p.x, y - p.y) < 0.5){
                e.push(p)
            }
        })
        this.players.forEach((p) => {
            p.live_bombs.forEach((b) => {
                if(Math.hypot(x - b.x, y - b.y) < 0.5){
                    e.push(b)
                }
            })
            
            if(Math.hypot(x - p.x, y - p.y) < 0.5){
                e.push(p)
            }
        })
        this.blocks.forEach((b) => {
            if(Math.hypot(x - b.x, y - b.y) < 0.5){
                e.push(b)
            }
        })
        this.walls.forEach((w) => {
            if(Math.hypot(x - w.x, y - w.y) < 0.5){
                e.push(w)
            }
        })
        this.ices.forEach((x) => {
            if(Math.hypot(x - x.x, y - x.y) < 0.5){
                e.push(x)
            }
        })
        this.muds.forEach((x) => {
            if(Math.hypot(x - x.x, y - x.y) < 0.5){
                e.push(x)
            }
        })
        this.fires.forEach((x) => {
            if(Math.hypot(x - x.x, y - x.y) < 0.5){
                e.push(x)
            }
        })
        this.teleporters.forEach((x) => {
            if((Math.hypot(x - x.x1, y - x.y1) < 0.5) || (Math.hypot(x - x.x2, y - x.y2) < 0.5)){
                e.push(x)
            }
        })
        return e
    }

    clearEntity(e){
        if(e instanceof Block){
            this.blocks.splice(this.blocks.indexOf(e), 1)
        }else if(e instanceof Wall){
            this.walls.splice(this.walls.indexOf(e), 1)
        }else if(e instanceof Powerup){
            this.powerups.splice(this.powerups.indexOf(e), 1)
        }else if(e instanceof Explosion){
            this.explosions.splice(this.explosions.indexOf(e), 1)
        }else if(e instanceof Bomb){
            this.explode(e)
        }else if(e instanceof Avatar){
            this.players.splice(this.players.indexOf(e), 1)
        }else if(e instanceof Ice){
            this.ices.splice(this.ices.indexOf(e), 1)
        }else if(e instanceof Mud){
            this.muds.splice(this.muds.indexOf(e), 1)
        }else if(e instanceof Fire){
            this.fires.splice(this.fires.indexOf(e), 1)
        }else if(e instanceof Teleporter){
            this.teleporters.splice(this.teleporters.indexOf(e), 1)
        }
    }

    clearAll(){
        this.players = []
        this.explosions = []
        this.blocks = []
        this.walls = []
        this.powerups = []
        this.ices = []
        this.muds = []
        this.fires = []
        this. teleporters = []
        this.cbq = []
    }
}

const CLOSING_TIME = 60000
const CLOSING_RATE = 700

const ROWS = 13
const COLS = 17

const SPAWN_Y = [[7], [7, 7], [13, 1, 13], [1, 1, 13, 13], [1, 1, 13, 13, 7], [1, 3, 3, 11, 11, 13], [1, 3, 3, 11, 11, 13, 7], [1, 1, 13, 13, 1, 13, 7, 7], [1, 1, 13, 13, 1, 13, 7, 7, 7], [1, 1, 13, 13, 1, 13, 4, 4, 10, 10]]
const SPAWN_X = [[9], [1, 17], [1, 9, 17], [1, 17, 1, 17], [1, 17, 1, 17, 9], [9, 1, 17, 1, 17, 9], [9, 1, 17, 1, 17, 9, 9], [1, 17, 1, 17, 9, 9, 5, 13], [1, 17, 1, 17, 9, 9, 3, 9, 15], [1, 17, 1, 17, 9, 9, 5, 13, 5, 13]]
const COLORS = ['GhostWhite', 'Gold', 'Green', 'FireBrick', 'MidnightBlue', 'DeepPink', 'Chartreuse', 'CornflowerBlue', 'OldLace', 'Purple']

export default class {
    constructor(client = false){
        this.all_players = {}
        this.scores = {}
        this.state = 'wait'
        this.client = client
        this.lobby = new RoomManager(ROWS, COLS, client)
        this.arena = new RoomManager(ROWS, COLS, client)
        this.time = 0
        this.color_choices = COLORS
        this.callbacks = {}

        // arena closing states
        this.cxmin = 1
        this.cxmax = this.arena.cols
        this.cymin = 1
        this.cymax = this.arena.rows
        this.cd = 0
        this.cx = 1
        this.cy = 1
        this.cn = 0
    }

    get numPlayers(){
        return Object.keys(this.all_players).length
    }

    on(ev, cb){
        if(!this.callbacks[ev]){
            this.callbacks[ev] = []
        }
        this.callbacks[ev].push(cb)
    }

    sync(json){
        let was_client = this.client
        let levi = this.lobby.cbq.length
        let aevi = this.arena.cbq.length
        let old_callbacks = this.callbacks
        Object.assign(this, json)
        Object.setPrototypeOf(this.lobby, RoomManager.prototype)
        Object.setPrototypeOf(this.arena, RoomManager.prototype)
        this.client = was_client
        this.lobby.client = was_client
        this.arena.client = was_client
        this.callbacks = old_callbacks

        for(var id in this.all_players){
            Object.setPrototypeOf(this.all_players[id], Avatar.prototype)
        }

        this.lobby.players.forEach((p) => {
            Object.setPrototypeOf(p, Avatar.prototype)
            p.live_bombs.forEach((b) => {
                Object.setPrototypeOf(b, Bomb.prototype)
            })
        })

        this.lobby.explosions.forEach((e) => {
            Object.setPrototypeOf(e, Explosion.prototype)
        })

        this.lobby.blocks.forEach((b) => {
            Object.setPrototypeOf(b, Block.prototype)
        })

        this.lobby.walls.forEach((w) => {
            Object.setPrototypeOf(w, Wall.prototype)
        })

        this.lobby.powerups.forEach((p) => {
            Object.setPrototypeOf(p, Powerup.prototype)
        })

        this.lobby.ices.forEach((x) => {
            Object.setPrototypeOf(x, Ice.prototype)
        })
        this.lobby.muds.forEach((x) => {
            Object.setPrototypeOf(x, Mud.prototype)
        })
        this.lobby.fires.forEach((x) => {
            Object.setPrototypeOf(x, Fire.prototype)
        })
        this.lobby.teleporters.forEach((x) => {
            Object.setPrototypeOf(x, Teleporter.prototype)
        })

        this.arena.players.forEach((p) => {
            Object.setPrototypeOf(p, Avatar.prototype)
            p.live_bombs.forEach((b) => {
                Object.setPrototypeOf(b, Bomb.prototype)
            })
        })

        this.arena.explosions.forEach((e) => {
            Object.setPrototypeOf(e, Explosion.prototype)
        })

        this.arena.blocks.forEach((b) => {
            Object.setPrototypeOf(b, Block.prototype)
        })

        this.arena.walls.forEach((w) => {
            Object.setPrototypeOf(w, Wall.prototype)
        })

        this.arena.powerups.forEach((p) => {
            Object.setPrototypeOf(p, Powerup.prototype)
        })

        this.arena.ices.forEach((x) => {
            Object.setPrototypeOf(x, Ice.prototype)
        })
        this.arena.muds.forEach((x) => {
            Object.setPrototypeOf(x, Mud.prototype)
        })
        this.arena.fires.forEach((x) => {
            Object.setPrototypeOf(x, Fire.prototype)
        })
        this.arena.teleporters.forEach((x) => {
            Object.setPrototypeOf(x, Teleporter.prototype)
        })

        for(let i = levi; i < this.lobby.cbq.length; i++){
            let ea = this.lobby.cbq[i]
            if(this.callbacks[ea.ev]){
                this.callbacks[ea.ev].forEach((cb) => {
                    cb(ea.args)
                })
            }
        }

        for(let i = aevi; i < this.arena.cbq.length; i++){
            let ea = this.arena.cbq[i]
            if(this.callbacks[ea.ev]){
                this.callbacks[ea.ev].forEach((cb) => {
                    cb(ea.args)
                })
            }
        }
    }

    addPlayer(id){
        if(this.numPlayers < 10){
            var c = this.color_choices.shift()
            this.all_players[id] = new Avatar(Math.floor(Math.random()*(this.lobby.cols - 7)) + 4, Math.floor(Math.random()*(this.lobby.rows - 5)) + 4, c)
            this.lobby.addPlayer(this.all_players[id])
            this.scores[id] = 0
        }
    }

    removePlayer(id){
        var avatar = this.all_players[id]
        if(avatar){
            var lai = this.lobby.players.indexOf(avatar)
            if(lai > -1){
                this.lobby.players.splice(lai, 1)
            }
            var aai = this.arena.players.indexOf(avatar)
            if(aai > -1){
                this.arena.players.splice(aai, 1)
            }
            this.color_choices.unshift(avatar.color)
            delete this.all_players[id]
        }
        delete this.scores[id]
    }

    handleInput(id, input){
        var avatar = this.all_players[id]
        if(avatar){
            if(input.press){
                if(input.x == 2){
                    avatar.dirs.push(180)
                    avatar.spd_sp = avatar.max_spd
                }else if(input.x == 0){
                    avatar.dirs.push(0)
                    avatar.spd_sp = avatar.max_spd
                }else if(input.x == 3){
                    avatar.dirs.push(270)
                    avatar.spd_sp = avatar.max_spd
                }else if(input.x == 1){
                    avatar.dirs.push(90)
                    avatar.spd_sp = avatar.max_spd
                }else if(input.x == 4){
                    var aai = this.arena.players.indexOf(avatar)
                    if(aai > -1){
                        this.arena.dropBomb(avatar)
                    }
                }
            }else{
                var ddi = -1
                if(input.x == 2){
                    ddi = avatar.dirs.indexOf(180)
                    avatar.last_dir = 180
                }else if(input.x == 0){
                    ddi = avatar.dirs.indexOf(0)
                    avatar.last_dir = 0
                }else if(input.x == 3){
                    ddi = avatar.dirs.indexOf(270)
                    avatar.last_dir = 270
                }else if(input.x == 1){
                    ddi = avatar.dirs.indexOf(90)
                    avatar.last_dir = 90
                }
                if(ddi > -1){
                    avatar.dirs.splice(ddi, 1)
                }
                
                if(avatar.dirs.length == 0){
                    avatar.spd_sp = 0;
                }
            }
        }
    }

    startGame(){
        this.lobby.clearAll()
        this.arena.clearAll()
        if(!this.client){
            this.arena.cbq.push({'ev': 'toArena'})
        }

        // generate map
        for(let i = 1; i <= this.arena.rows; i++){
            for(let j = 1; j <= this.arena.cols; j++){
                // walls every 'other' block
                if(i % 2 == 0 && j % 2 == 0){
                    this.arena.createWall(j, i)
                }else if(!this.client){
                    // randomly place some blocks
                    let k = Math.random()*8
                    if(k <= 7){
                        this.arena.createBlock(j, i)
                    }
                }
            }
        }

        // spawn ice
        let Pr = Math.PI/this.arena.rows
        let Pc = Math.PI/this.arena.cols
        let ix = [Math.random(), Math.random(), Math.random()]
        let iy = [Math.random(), Math.random(), Math.random()]
        let ixp = [Math.random(), Math.random(), Math.random()]
        let iyp = [Math.random(), Math.random(), Math.random()]
        let it = Math.random()
        for(let i = 1; i <= this.arena.rows; i++){
            for(let j = 1; j <= this.arena.cols; j++){
                let zy = iy[0]*Math.sin(Pr*i + iyp[0]) + iy[1]*Math.sin(2*Pr*i + iyp[1]) + iy[2]*Math.sin(3*Pr*i + iyp[2])
                let zx = ix[0]*Math.sin(Pc*j + ixp[0]) + ix[1]*Math.sin(2*Pc*j + ixp[1]) + ix[2]*Math.sin(3*Pc*j + ixp[2])
                if(zx*zy > it){
                    this.arena.createIce(j, i)
                }
            }
        }

        // spawn mud
        ix = [Math.random(), Math.random(), Math.random()]
        iy = [Math.random(), Math.random(), Math.random()]
        ixp = [Math.random(), Math.random(), Math.random()]
        iyp = [Math.random(), Math.random(), Math.random()]
        it = Math.random()
        for(let i = 1; i <= this.arena.rows; i++){
            for(let j = 1; j <= this.arena.cols; j++){
                let zy = iy[0]*Math.sin(Pr*i + iyp[0]) + iy[1]*Math.sin(2*Pr*i + iyp[1]) + iy[2]*Math.sin(3*Pr*i + iyp[2])
                let zx = ix[0]*Math.sin(Pc*j + ixp[0]) + ix[1]*Math.sin(2*Pc*j + ixp[1]) + ix[2]*Math.sin(3*Pc*j + ixp[2])
                if(zx*zy > it){
                    this.arena.createMud(j, i)
                }
            }
        }

        // reset arena closing variables
        this.cxmin = 1
        this.cxmax = this.arena.cols
        this.cymin = 1
        this.cymax = this.arena.rows

        // decide the random closing direction
        this.cd = Math.floor(Math.random()*4)
        if(this.cd == 0 || this.client){
            this.cx = 1
            this.cy = 1
        }else if(this.cd == 1){
            this.cx = this.arena.cols
            this.cy = 1
        }else if(this.cd == 2){
            this.cx = this.arena.cols
            this.cy = this.arena.rows
        }else if(this.cd == 3){
            this.cx = 1
            this.cy = this.arena.rows
        }
        this.cn = 0

        let spawnx = [...SPAWN_X[this.numPlayers - 1]]
        let spawny = [...SPAWN_Y[this.numPlayers - 1]]
        // shuffle spawn points
        for(let i = spawnx.length - 1; i > 0; i--){
            let j = Math.floor(Math.random() * (i + 1))
            let a = spawnx[j]
            spawnx[j] = spawnx[i]
            spawnx[i] = a
            a = spawny[j]
            spawny[j] = spawny[i]
            spawny[i] = a
        }

        // spawn players
        for(let id in this.all_players){
            let c = this.all_players[id].color

            this.all_players[id] = new Avatar(spawnx.pop(), spawny.pop(), c)
            this.arena.addPlayer(this.all_players[id])
        }

        // randomly pick up to 6 blocks and replace them with teleporters
        let num_teleporters = Math.round(Math.random()*3)
        for(let i = 0; i < num_teleporters; i++){
            let ib1 = Math.floor(Math.random()*this.arena.blocks.length)
            let x1 = this.arena.blocks[ib1].x
            let y1 = this.arena.blocks[ib1].y
            this.arena.blocks.splice(ib1, 1)
            let ib2 = Math.floor(Math.random()*this.arena.blocks.length)
            let x2 = this.arena.blocks[ib2].x
            let y2 = this.arena.blocks[ib2].y
            this.arena.blocks.splice(ib2, 1)
            this.arena.createTeleporter(x1, y1, x2, y2)
        }
    }
    
    endGame(){
        // move all players into the lobby
        for(let id in this.all_players){
            if(this.lobby.players.indexOf(this.all_players[id]) < 0){
                let c = this.all_players[id].color
                this.all_players[id] = new Avatar(Math.floor(Math.random()*(this.lobby.cols - 7)) + 4, Math.floor(Math.random()*(this.lobby.rows - 5)) + 4, c)
                this.all_players[id].max_bombs = 0
                this.lobby.addPlayer(this.all_players[id])
            }
        }
        if(!this.client){
            this.lobby.cbq.push({'ev': 'toLobby'})
        }
    }

    update(dt){
        if(this.state == 'play'){
            if(this.arena.players.length <= 1){
                this.state = 'endgame'
                this.time = 0
            }else{
                var T = this.time - CLOSING_TIME
                if(T > 0){
                    var n = Math.floor(T/CLOSING_RATE)
                    this.closeArena(n)
                }
            }
            this.time += dt
            this.arena.update(dt)
            
        }else if(this.state == 'endgame'){
            if(this.time > 2000){
                this.state = 'wait'
                this.time = 0
                var winners = [...this.arena.players]
                winners.forEach((p) => {
                    for(var id in this.all_players){
                        if(p == this.all_players[id]){
                            this.scores[id] += 1
                        }
                    }
                })
                
                this.arena.clearAll()
                this.endGame()
            }else{
                this.time += dt
                this.arena.update(dt)
            }
            
        }else if(this.state == 'wait'){
            var ready = 0
            this.lobby.players.forEach((p) => {
                if(p.y <= 3){
                    ready += 1;
                }
            })
            if(this.numPlayers > 1 && ready >= this.numPlayers){
                this.state = 'play'
                this.startGame()
            }
            this.lobby.update(dt)
        }
    }

    closeArena(n){
        if(n <= this.arena.cols*this.arena.rows && n > this.cn){
            var es = this.arena.getEntitiesAt(this.cx, this.cy)
            es.forEach((e) => {
                this.arena.clearEntity(e)
            })
            this.arena.createWall(this.cx, this.cy)
    
            if(this.cd == 0){
                if(this.cx >= this.cxmax){
                    this.cd = 1
                    this.cy += 1
                    this.cymin += 1
                }else{
                    this.cx += 1
                }
            }else if(this.cd == 1){
                if(this.cy >= this.cymax){
                    this.cd = 2
                    this.cx -= 1
                    this.cxmax -= 1
                }else{
                    this.cy += 1
                }
            }else if(this.cd == 2){
                if(this.cx <= this.cxmin){
                    this.cd = 3
                    this.cy -= 1
                    this.cymax -= 1
                }else{
                    this.cx -= 1
                }
            }else if(this.cd == 3){
                if(this.cy <= this.cymin){
                    this.cd = 0
                    this.cx += 1
                    this.cxmin += 1
                }else{
                    this.cy -= 1
                }
            }
            this.cn = n
        }
    }
}
