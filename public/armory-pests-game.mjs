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
        this.bomb_fuse = 3
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
            let dir = this.last_dir
            if(this.dirs.length > 1){
                let d1 = this.dirs[this.dirs.length - 2]
                let d2 = this.dirs[this.dirs.length - 1]
                if((this.blocked_right && d1 == 0) || (this.blocked_left && d1 == 4) 
                    || (this.blocked_down && d1 == 2) || (this.blocked_up && d1 == 6)){
                    dir = d2
                }else{
                    dir = d1
                }
            }else if(this.dirs.length > 0){
                dir = this.dirs[this.dirs.length - 1]
            }
            if(this.reverse_time > 0){
                dir = (dir + 4) % 8
            }

            return dir
        }
    }

    update(dt){
        let d1 = this.direction
        let dir = d1*Math.PI/4
        let spd_err = this.spd_sp*this.max_spd - this.spd;
        let spd = this.spd + Math.sign(spd_err)*Math.min(Math.abs(spd_err), this.max_spd/3)
        spd = Math.max(Math.min(spd, this.max_spd), 0)
        spd = Math.min(spd, 7.5)
        if(this.slowed){
            spd = Math.min(spd, 2.5)
        }
        
        if((this.blocked_right && d1 == 0) || (this.blocked_left && d1 == 4) 
            || (this.blocked_down && d1 == 2) || (this.blocked_up && d1 == 6)){
            this.spd = 0
        }else{
            this.spd = spd
            this.x += Math.cos(dir)*spd*dt*0.02
            this.y += Math.sin(dir)*spd*dt*0.02;
        }

        for(let i = this.live_bombs.length - 1; i >= 0; i--){
            if(this.live_bombs[i].state == 1 && this.live_bombs[i].time <= 0){
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

    serialize(){
        let n_bytes = Math.ceil((2*7 + 1*10 + 1 + this.dirs.length + 1 + this.live_bombs.length*16)/2)*2
        let buffer = new ArrayBuffer(n_bytes)
        let float_view = new Int16Array(buffer)
        float_view[0] = this.x*256
        float_view[1] = this.y*256
        float_view[2] = this.spd*256
        float_view[3] = this.shield_time
        float_view[4] = this.reverse_time
        float_view[5] = this.poop_time
        float_view[6] = this.invis_time

        let int_view = new Uint8Array(buffer, 14)
        int_view[0] = this.color
        int_view[1] = Math.floor(this.max_spd)
        int_view[2] = this.max_bombs
        int_view[3] = this.bomb_len
        int_view[4] = this.bomb_spd
        int_view[5] = this.bomb_fuse
        int_view[6] = (this.bomb_split == 8 ? 1 : 0) << 2 | (this.bomb_power ? 1 : 0) << 1 | (this.bomb_kick ? 1 : 0)
        int_view[7] = (this.slowed ? 1 : 0) << 5 | (this.spd_sp) << 4 | (this.blocked_left ? 1 : 0) << 3 |
                        (this.blocked_down ? 1 : 0) << 2 | (this.blocked_right ? 1 : 0) << 1 | (this.blocked_up ? 1 : 0)
        int_view[8] = this.last_dir
        int_view[9] = this.slide_dir + 1

        int_view[10] = this.dirs.length
        for(let i = 0; i < this.dirs.length; i++){
            int_view[11 + i] = this.dirs[i] 
        }
        int_view[11 + this.dirs.length] = this.live_bombs.length
        let k = 12 + this.dirs.length
        this.live_bombs.forEach(bomb => {
            let bomb_buf = bomb.serialize()
            int_view.set(new Uint8Array(bomb_buf), k)
            k += bomb_buf.byteLength
        })

        return buffer
    }

    deserialize(buffer){
        let float_view = new Int16Array(buffer)
        this.x = float_view[0]/256
        this.y = float_view[1]/256
        this.spd = float_view[2]/256
        this.shield_time = float_view[3]
        this.reverse_time = float_view[4]
        this.poop_time = float_view[5]
        this.invis_time = float_view[6]

        let int_view = new Uint8Array(buffer, 14)
        this.color = int_view[0]
        this.max_spd = int_view[1] + 0.5
        this.max_bombs = int_view[2]
        this.bomb_len = int_view[3]
        this.bomb_spd = int_view[4]
        this.bomb_fuse = int_view[5]
        this.bomb_split = 4 + 4*(int_view[6] >> 2 & 1)
        this.bomb_power = int_view[6] >> 1 & 1 > 0
        this.bomb_kick = int_view[6] & 1 > 0
        this.slowed = int_view[7] >> 5 & 1 > 0
        this.spd_sp = int_view[7] >> 4 & 1

        this.blocked_left = ((int_view[7] >> 3) & 1) > 0
        this.blocked_down = ((int_view[7] >> 2) & 1) > 0
        this.blocked_right = ((int_view[7] >> 1) & 1) > 0
        this.blocked_up = (int_view[7] & 1) > 0
        this.last_dir = int_view[8]
        this.slide_dir = int_view[9] - 1

        let dir_len = int_view[10]
        for(let i = 0; i < dir_len; i++){
            if(i >= this.dirs.length){
                this.dirs.push(0)
            }
            this.dirs[i] = int_view[11 + i]
        }
        this.dirs.length = dir_len

        let bombs_len = int_view[11 + dir_len]
        let k = 14 + 12 + this.dirs.length
        for(let i = 0; i < bombs_len; i++){
            if(i >= this.live_bombs.length){
                this.live_bombs.push(new Bomb(this.x, this.y, this.bomb_spd, this.bomb_fuse*50, this.bomb_len, this.bomb_split, this.bomb_power))
            }
            this.live_bombs[i].deserialize(buffer.slice(k, k + 16))
            k += 16
        }
        this.live_bombs.length = bombs_len
    }
}

class Bomb {
    constructor(x, y, spd, time, len, num, power){
        this.x = x
        this.y = y
        this.spd = spd
        this.time = time
        this.vx = 0
        this.vy = 0
        this.num = num
        this.len = len
        
        this.state = 0
        this.intangible = true
        this.power = power
        this.slowed = false

        this.blocked_up = false
        this.blocked_down = false
        this.blocked_left = false
        this.blocked_right = false
    }

    update(dt){
        this.time -= dt

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

        this.x += this.vx*dt*0.02
        this.y += this.vy*dt*0.02

        if(this.slowed){
            this.vx -= this.vx*dt*0.5
            this.vy -= this.vy*dt*0.5
        }else{
            this.vx -= this.vx*dt*0.02
            this.vy -= this.vy*dt*0.02
        }
    }

    serialize(){
        let n_bytes = 2*6 + 3 + 1
        let buffer = new ArrayBuffer(n_bytes)
        let float_view = new Int16Array(buffer)
        float_view[0] = this.x*256
        float_view[1] = this.y*256
        float_view[2] = this.spd*256
        float_view[3] = this.time
        float_view[4] = this.vx*256
        float_view[5] = this.vy*256

        let int_view = new Uint8Array(buffer, 12)
        int_view[0] = this.num
        int_view[1] = this.len
        int_view[2] = 0
        int_view[2] |= (this.state) << 7
        int_view[2] |= (this.intangible ? 1 : 0) << 6
        int_view[2] |= (this.power ? 1 : 0) << 5
        int_view[2] |= (this.slowed ? 1 : 0) << 4
        int_view[2] |= (this.blocked_left ? 1 : 0) << 3
        int_view[2] |= (this.blocked_down ? 1 : 0) << 2
        int_view[2] |= (this.blocked_right ? 1 : 0) << 1
        int_view[2] |= (this.blocked_up ? 1 : 0)

        return buffer
    }

    deserialize(buffer){
        let float_view = new Int16Array(buffer)
        this.x = float_view[0]/256
        this.y = float_view[1]/256
        this.spd = float_view[2]/256
        this.time = float_view[3]
        this.vx = float_view[4]/256
        this.vy = float_view[5]/256

        let int_view = new Uint8Array(buffer, 12)
        this.num = int_view[0]
        this.len = int_view[1]
        this.state = int_view[2] >> 7 & 1
        this.intangible = int_view[2] >> 6 & 1 == 1
        this.power = int_view[2] >> 5 & 1 == 1
        this.slowed = int_view[2] >> 4 & 1 == 1
        this.blocked_left = int_view[2] >> 3 & 1 == 1
        this.blocked_down = int_view[2] >> 2 & 1 == 1
        this.blocked_right = int_view[2] >> 1 & 1 == 1
        this.blocked_up = int_view[2] >> 0 & 1 == 1
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
        var dir = this.dir*Math.PI/4;
        var dx = Math.cos(dir)*this.spd*dt*0.02
        var dy = Math.sin(dir)*this.spd*dt*0.02
        this.x += dx
        this.y += dy
        this.len -= Math.hypot(dx, dy)
    }

    serialize(){
        let n_bytes = 2*4 + 3 + 1
        let buffer = new ArrayBuffer(n_bytes)
        let float_view = new Int16Array(buffer)
        float_view[0] = this.x*256
        float_view[1] = this.y*256
        float_view[2] = this.spd*256
        float_view[3] = this.len*256

        let int_view = new Uint8Array(buffer, 8)
        int_view[0] = this.dir
        int_view[1] = this.max_len
        int_view[2] = this.power ? 1 : 0

        return buffer
    }

    deserialize(buffer){
        let float_view = new Int16Array(buffer)
        this.x = float_view[0]/256
        this.y = float_view[1]/256
        this.spd = float_view[2]/256
        this.len = float_view[3]/256

        let int_view = new Uint8Array(buffer, 8)
        this.dir = int_view[0]
        this.max_len = int_view[1]
        this.power = int_view[2] == 1
    }
}

class Block {
    constructor(x, y){
        this.x = x
        this.y = y
    }

    update(dt){

    }

    serialize(){
        let n_bytes = 2
        let buffer = new ArrayBuffer(n_bytes)
        let int_view = new Uint8Array(buffer)
        int_view[0] = this.x
        int_view[1] = this.y

        return buffer
    }

    deserialize(buffer){
        let int_view = new Uint8Array(buffer)
        this.x = int_view[0]
        this.y = int_view[1]
    }
}

class Powerup {
    constructor(x, y, type, label){
        this.x = x
        this.y = y
        this.type = type
        this.label = label
        this.indestructable_time = 50
    }

    update(dt){
        if(this.indestructable_time > 0){
            this.indestructable_time -= dt
        }
    }

    serialize(){
        let n_bytes = 5
        let buffer = new ArrayBuffer(n_bytes)
        let int_view = new Uint8Array(buffer)
        int_view[0] = this.x
        int_view[1] = this.y
        int_view[2] = this.indestructable_time
        int_view[3] = this.type
        int_view[4] = this.label

        return buffer
    }

    deserialize(buffer){
        let int_view = new Uint8Array(buffer)
        this.x = int_view[0]
        this.y = int_view[1]
        this.indestructable_time = int_view[2]
        this.type = int_view[3]
        this.label = int_view[4]
    }
}

class Wall {
    constructor(x, y){
        this.x = x
        this.y = y
    }

    update(dt){

    }

    serialize(){
        let n_bytes = 2
        let buffer = new ArrayBuffer(n_bytes)
        let int_view = new Uint8Array(buffer)
        int_view[0] = this.x
        int_view[1] = this.y

        return buffer
    }

    deserialize(buffer){
        let int_view = new Uint8Array(buffer)
        this.x = int_view[0]
        this.y = int_view[1]
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

    serialize(){
        let n_bytes = 2
        let buffer = new ArrayBuffer(n_bytes)
        let int_view = new Uint8Array(buffer)
        int_view[0] = this.x
        int_view[1] = this.y

        return buffer
    }

    deserialize(buffer){
        let int_view = new Uint8Array(buffer)
        this.x = int_view[0]
        this.y = int_view[1]
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

    serialize(){
        let n_bytes = 2
        let buffer = new ArrayBuffer(n_bytes)
        let int_view = new Uint8Array(buffer)
        int_view[0] = this.x
        int_view[1] = this.y

        return buffer
    }

    deserialize(buffer){
        let int_view = new Uint8Array(buffer)
        this.x = int_view[0]
        this.y = int_view[1]
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

    serialize(){
        let n_bytes = 2
        let buffer = new ArrayBuffer(n_bytes)
        let int_view = new Uint8Array(buffer)
        int_view[0] = this.x
        int_view[1] = this.y

        return buffer
    }

    deserialize(buffer){
        let int_view = new Uint8Array(buffer)
        this.x = int_view[0]
        this.y = int_view[1]
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

    serialize(){
        let n_bytes = (4 + 1 + 1 + this.already_teleported.length)
        let buffer = new ArrayBuffer(n_bytes)
        let int_view = new Uint8Array(buffer)
        int_view[0] = this.x1
        int_view[1] = this.y1
        int_view[2] = this.x2
        int_view[3] = this.y2

        int_view[4] = this.disabled ? 1 : 0
        int_view[5] = this.already_teleported.length
        for(let i = 0; i < this.already_teleported.length; i++){
            int_view[6 + i] = this.already_teleported[i]
        }

        return buffer
    }

    deserialize(buffer){
        let int_view = new Uint8Array(buffer)
        this.x1 = int_view[0]
        this.y1 = int_view[1]
        this.x2 = int_view[2]
        this.y2 = int_view[3]

        this.disabled = int_view[4] > 0
        let at_len = int_view[5]
        for(let i = 0; i < at_len; i++){
            if(i >= this.already_teleported.length){
                this.already_teleported.push(0)
            }
            this.already_teleported[i] = int_view[6 + i]
        }
        this.already_teleported.length = at_len
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
        this.evhands = []
    }

    serialize(){
        let n_bytes = 2*2 + 2*(9)

        let player_buffers = []
        this.players.forEach(p => {
            let x = p.serialize()
            player_buffers.push(x)
            n_bytes += x.byteLength + 1
        })

        let explosion_buffers = []
        this.explosions.forEach(e => {
            let x = e.serialize()
            explosion_buffers.push(x)
            n_bytes += x.byteLength + 1
        })

        let block_buffers = []
        this.blocks.forEach(e => {
            let x = e.serialize()
            block_buffers.push(x)
            n_bytes += x.byteLength + 1
        })

        let wall_buffers = []
        this.walls.forEach(e => {
            let x = e.serialize()
            wall_buffers.push(x)
            n_bytes += x.byteLength + 1
        })

        let powerup_buffers = []
        this.powerups.forEach(e => {
            let x = e.serialize()
            powerup_buffers.push(x)
            n_bytes += x.byteLength + 1
        })

        let ice_buffers = []
        this.ices.forEach(e => {
            let x = e.serialize()
            ice_buffers.push(x)
            n_bytes += x.byteLength + 1
        })

        let mud_buffers = []
        this.muds.forEach(e => {
            let x = e.serialize()
            mud_buffers.push(x)
            n_bytes += x.byteLength + 1
        })

        let fire_buffers = []
        this.fires.forEach(e => {
            let x = e.serialize()
            fire_buffers.push(x)
            n_bytes += x.byteLength + 1
        })

        let teleporter_buffers = []
        this.teleporters.forEach(e => {
            let x = e.serialize()
            teleporter_buffers.push(x)
            n_bytes += x.byteLength + 1
        })

        let buffer = new ArrayBuffer(Math.ceil(n_bytes/2)*2)
        let size_view = new Uint16Array(buffer)
        size_view[0] = this.rows
        size_view[1] = this.cols
        size_view[2] = this.players.length
        size_view[3] = this.explosions.length
        size_view[4] = this.blocks.length
        size_view[5] = this.walls.length
        size_view[6] = this.powerups.length
        size_view[7] = this.ices.length
        size_view[8] = this.muds.length
        size_view[9] = this.fires.length
        size_view[10] = this.teleporters.length

        let byte_view = new Uint8Array(buffer, 22)
        let o = 0
        player_buffers.forEach(x => {
            byte_view[o] = x.byteLength
            byte_view.set(new Uint8Array(x), o + 1)
            o += x.byteLength + 1
        })
        explosion_buffers.forEach(x => {
            byte_view[o] = x.byteLength
            byte_view.set(new Uint8Array(x), o + 1)
            o += x.byteLength + 1
        })
        block_buffers.forEach(x => {
            byte_view[o] = x.byteLength
            byte_view.set(new Uint8Array(x), o + 1)
            o += x.byteLength + 1
        })
        wall_buffers.forEach(x => {
            byte_view[o] = x.byteLength
            byte_view.set(new Uint8Array(x), o + 1)
            o += x.byteLength + 1
        })
        powerup_buffers.forEach(x => {
            byte_view[o] = x.byteLength
            byte_view.set(new Uint8Array(x), o + 1)
            o += x.byteLength + 1
        })
        ice_buffers.forEach(x => {
            byte_view[o] = x.byteLength
            byte_view.set(new Uint8Array(x), o + 1)
            o += x.byteLength + 1
        })
        mud_buffers.forEach(x => {
            byte_view[o] = x.byteLength
            byte_view.set(new Uint8Array(x), o + 1)
            o += x.byteLength + 1
        })
        fire_buffers.forEach(x => {
            byte_view[o] = x.byteLength
            byte_view.set(new Uint8Array(x), o + 1)
            o += x.byteLength + 1
        })
        teleporter_buffers.forEach(x => {
            byte_view[o] = x.byteLength
            byte_view.set(new Uint8Array(x), o + 1)
            o += x.byteLength + 1
        })

        return buffer
    }

    deserialize(buffer){
        let size_view = new Uint16Array(buffer)
        this.rows = size_view[0]
        this.cols = size_view[1]
        let n_players = size_view[2]
        let n_explosions = size_view[3]
        let n_blocks = size_view[4]
        let n_walls = size_view[5]
        let n_powerups = size_view[6]
        let n_ices = size_view[7]
        let n_muds = size_view[8]
        let n_fires = size_view[9]
        let n_teleporters = size_view[10]

        let o = 0
        let byte_view = new Uint8Array(buffer, o + 22)
        for(let i = 0; i < n_players; i++){
            if(i >= this.players.length){
                this.players.push(new Avatar(0, 0, 0))
            }
            let n = byte_view[o]
            let player_buf = buffer.slice(22 + o + 1, 22 + o + 1 + n)
            this.players[i].deserialize( player_buf )
            o += n + 1
        }
        this.players.length = n_players

        for(let i = 0; i < n_explosions; i++){
            if(i >= this.explosions.length){
                this.explosions.push(new Explosion(0, 0, 0, 0, 1, false))
            }
            let n = byte_view[o]
            this.explosions[i].deserialize( buffer.slice(22 + o + 1, 22 + o + 1 + n) )
            o += n + 1
        }
        this.explosions.length = n_explosions

        for(let i = 0; i < n_blocks; i++){
            if(i >= this.blocks.length){
                this.blocks.push(new Block(0, 0))
            }
            let n = byte_view[o]
            this.blocks[i].deserialize( buffer.slice(22 + o + 1, 22 + o + 1 + n) )
            o += n + 1
        }
        this.blocks.length = n_blocks

        for(let i = 0; i < n_walls; i++){
            if(i >= this.walls.length){
                this.walls.push(new Wall(0, 0))
            }
            let n = byte_view[o]
            this.walls[i].deserialize( buffer.slice(22 + o + 1, 22 + o + 1 + n) )
            o += n + 1
        }
        this.walls.length = n_walls

        for(let i = 0; i < n_powerups; i++){
            if(i >= this.powerups.length){
                this.powerups.push(new Powerup(0, 0, 0, 0))
            }
            let n = byte_view[o]
            this.powerups[i].deserialize( buffer.slice(22 + o + 1, 22 + o + 1 + n) )
            o += n + 1
        }
        this.powerups.length = n_powerups

        for(let i = 0; i < n_ices; i++){
            if(i >= this.ices.length){
                this.ices.push(new Ice(0, 0))
            }
            let n = byte_view[o]
            this.ices[i].deserialize( buffer.slice(22 + o + 1, 22 + o + 1 + n) )
            o += n + 1
        }
        this.ices.length = n_ices

        for(let i = 0; i < n_muds; i++){
            if(i >= this.muds.length){
                this.muds.push(new Mud(0, 0))
            }
            let n = byte_view[o]
            this.muds[i].deserialize( buffer.slice(22 + o + 1, 22 + o + 1 + n) )
            o += n + 1
        }
        this.muds.length = n_muds

        for(let i = 0; i < n_fires; i++){
            if(i >= this.fires.length){
                this.fires.push(new Fire(0, 0))
            }
            let n = byte_view[o]
            this.fires[i].deserialize( buffer.slice(22 + o + 1, 22 + o + 1 + n) )
            o += n + 1
        }
        this.fires.length = n_fires

        for(let i = 0; i < n_teleporters; i++){
            if(i >= this.teleporters.length){
                this.teleporters.push(new Teleporter(0, 0, 0, 0))
            }
            let n = byte_view[o]
            this.teleporters[i].deserialize( buffer.slice(22 + o + 1, 22 + o + 1 + n) )
            o += n + 1
        }
        this.teleporters.length = n_teleporters
    }

    fireEvent(ev, args){
        if(!this.client){
            this.evhands.forEach(h => {
                h( { ev: ev, args: args })
            })
        }
    }

    addEventHandler(h){
        this.evhands.push(h)
    }
    
    update(dt){
        this.players.forEach((p) => {
            p.update(dt)
            p.live_bombs.forEach((b) => {
                b.update(dt)

                if(b.time <= 0 && b.state == 0){
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
        
        this.checkCollisions()
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
                var bomb = new Bomb(bomb_x, bomb_y, p.bomb_spd, p.bomb_fuse*50, p.bomb_len, p.bomb_split, p.bomb_power)
                p.live_bombs.push(bomb)
            }
        }
    }

    explode(b){
        b.state = 1
        b.time = 12
        this.createExplosions(b.x, b.y, b.spd, b.num, b.len, b.power)
        this.fireEvent('explode', b)
    }

    pickUpPower(player, power){
        if(power.type == 1){
            player.max_bombs += 1
        }else if(power.type == 2){
            player.max_spd += 1
        }else if(power.type == 3){
            player.bomb_len += 1
        }else if(power.type == 4){
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
        }else if(power.type == 5){
            player.bomb_power = true
        }else if(power.type == 6){
            player.bomb_split = 8
        }else if(power.type == 7){
            player.shield_time += 500
        }else if(power.type == 8){
            player.bomb_kick = true
        }else if(power.type == 9){
            player.reverse_time = 500
        }else if(power.type == 10){
            player.poop_time = 450
        }else if(power.type == 11){
            player.max_bombs = 8
            player.max_spd = 7.5
            player.bomb_len = 10
            player.bomb_kick = true
            player.bomb_split = 8
            player.bomb_power = true
        }else if(power.type == 0){
            player.max_bombs = 1
            player.max_spd = 2.5
            player.bomb_len = 2
            player.bomb_kick = false
            player.bomb_split = 4
            player.bomb_power = false
            player.shield_time = 0
        }else if(power.type == 12){
            player.invis_time = 500
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
                if(Math.abs(b.vx) > 0.001){
                    b.y = Math.round(b.y)
                }
                if(Math.abs(b.vy) > 0.001){
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
                        p.slide_dir = 2
                    }else if(adj_clear && adjy < p.y && adjy >= 1){
                        p.slide_dir = 6
                    }
                    p.blocked_right = true
                    
                }else if(p.direction == 2 && p.y <= this.rows - 1){
                    var es = this.getEntitiesAt(adjx, adjy + 1)
                    var adj_clear = true
                    es.forEach((e) => {
                        adj_clear &= !(e instanceof Block) && !(e instanceof Wall) && !(e instanceof Bomb)
                    })
                    
                    if(adj_clear && adjx > p.x && adjx <= this.cols){
                        p.slide_dir = 0
                    }else if(adj_clear && adjx < p.x && adjx >= 1){
                        p.slide_dir = 4
                    }
                    p.blocked_down = true
                    
                }else if(p.direction == 4 && p.x >= 2){
                    var es = this.getEntitiesAt(adjx - 1, adjy)
                    var adj_clear = true
                    es.forEach((e) => {
                        adj_clear &= !(e instanceof Block) && !(e instanceof Wall) && !(e instanceof Bomb)
                    })
                    
                    if(adj_clear && adjy > p.y && adjy <= this.rows){
                        p.slide_dir = 2
                    }else if(adj_clear && adjy < p.y && adjy >= 1){
                        p.slide_dir = 6
                    }
                    p.blocked_left = true
                    
                }else if(p.direction == 6 && p.y >= 2){
                    var es = this.getEntitiesAt(adjx, adjy - 1)
                    var adj_clear = true
                    es.forEach((e) => {
                        adj_clear &= !(e instanceof Block) && !(e instanceof Wall) && !(e instanceof Bomb)
                    })
                    
                    if(adj_clear && adjx > p.x && adjx <= this.cols){
                        p.slide_dir = 0
                    }else if(adj_clear && adjx < p.x && adjx >= 1){
                        p.slide_dir = 4
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
                        if(!b.slowed && p.bomb_kick && p.direction == 4 && p.spd > 0){
                            b.vx = -(p.spd + 3)
                        }else{
                            b.vx = 0
                        }
                    }
                }else{
                    if(dy > 0){
                        p.blocked_down = true
                        if(!b.slowed && p.bomb_kick && p.direction == 2 && p.spd > 0){
                            b.vy = p.spd + 3
                        }else{
                            b.vy = 0
                        }
                    }else{
                        p.blocked_up = true
                        if(!b.slowed && p.bomb_kick && p.direction == 6 && p.spd > 0){
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

    checkCollisions(){
        // explosions on walls
        for(var i = this.explosions.length - 1; i >= 0; i--){
            for(var j = this.walls.length - 1; j >= 0; j--){
                var d = Math.hypot(this.walls[j].x - this.explosions[i].x, this.walls[j].y - this.explosions[i].y)
                if(d < 0.5){
                    this.explosions.splice(i, 1)
                    break
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
                    break
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
                        if(b.state == 0){
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
                    if(p.live_bombs[i].state == 0){
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
                if(p.direction == 4){
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
                if(p.direction == 6){
                    p.spd = 0
                }
            }
            if(p.y > this.rows){
                p.blocked_down = true
                p.y = Math.min(p.y, this.rows)
                if(p.direction == 2){
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
        this.fires.forEach((x) => {
            for(var j = this.players.length - 1; j >= 0; j--){
                if(Math.hypot(this.players[j].x - x.x, this.players[j].y - x.y) < 0.5){
                    this.players[j].live_bombs.forEach((b) => {
                        if(b.state == 0){
                            this.explode(b)
                        }
                    })
                    this.fireEvent('died', this.players[j])
                    this.players.splice(j, 1)
                }
            }
        })

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
                    let ati = x.already_teleported.indexOf(p.color)
                    if(ati < 0 && !x.disabled){
                        if(Math.hypot(p.x - x.x1, p.y - x.y1) < 0.2){
                            let delta_x = p.x - x.x1
                            let delta_y = p.y - x.y1
                            p.x = x.x2 + delta_x
                            p.y = x.y2 + delta_y

                            this.fireEvent('teleport', [{x: x.x2 + delta_x, y: x.y2 + delta_y}, {x: x.x1 + delta_x, y: x.y1 + delta_y}])
                            x.already_teleported.push(p.color)
                        }else if(Math.hypot(p.x - x.x2, p.y - x.y2) < 0.2){
                            let delta_x = p.x - x.x2
                            let delta_y = p.y - x.y2
                            p.x = x.x1 + delta_x
                            p.y = x.y1 + delta_y

                            this.fireEvent('teleport', [{x: x.x1 + delta_x, y: x.y1 + delta_y}, {x: x.x2 + delta_x, y: x.y2 + delta_y}])
                            x.already_teleported.push(p.color)
                        }
                    }
                })
                
                for(let i = x.already_teleported.length - 1; i >= 0; i--){
                    let z = this.players.find(p => p.color == x.already_teleported[i])
                    if(!z){
                        x.already_teleported.splice(i, 1)
                    }else{
                        if(Math.hypot(z.x - x.x1, z.y - x.y1) > 0.717 && Math.hypot(z.x - x.x2, z.y - x.y2) > 0.717){
                            x.already_teleported.splice(i, 1)
                        }
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
            var dir = 8/num*i
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

    createPowerUp(x, y, type = 255){
        let label = type
        if(type == 255){
            var r = Math.floor(Math.random()*35)
            if(r >= 0 && r < 6){
                type = 1
                label = 1
            }else if(r >= 6 && r < 12){
                type = 3
                label = 3
            }else if(r >= 12 && r < 18){
                type = 2
                label = 2
            }else if(r >= 18 && r < 20){
                type = 8
                label = 8
            }else if(r >= 20 && r < 22){
                type = 5
                label = 5
            }else if(r >= 22 && r < 24){
                type = 6
                label = 6
            }else if(r >= 24 && r < 27){
                type = 7
                label = 7
            }else if(r >= 27 && r < 29){
                type = 12
                label = 12
            }else if(r >= 29 && r < 31){
                type = 9
                label = 0
            }else if(r >= 31 && r < 33){
                type = 10
                label = 0
            }else if(r >= 33 && r < 34){
                type = 0
                label = 0
            }else if(r >= 34 && r < 35){
                type = 4
                label = 4
            }

            if(Math.random()*5 < 1){
                label = 13
                if(type != 0 && Math.floor(Math.random()*20) < 1){
                    type = 11
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
        this.teleporters = []
    }
}

const CLOSING_TIME = 3000
const CLOSING_RATE = 35

const ROWS = 13
const COLS = 17

const SPAWN_Y = [[7], [7, 7], [13, 1, 13], [1, 1, 13, 13], [1, 1, 13, 13, 7], [1, 3, 3, 11, 11, 13], [1, 3, 3, 11, 11, 13, 7], [1, 1, 13, 13, 1, 13, 7, 7], [1, 1, 13, 13, 1, 13, 7, 7, 7], [1, 1, 13, 13, 1, 13, 4, 4, 10, 10]]
const SPAWN_X = [[9], [1, 17], [1, 9, 17], [1, 17, 1, 17], [1, 17, 1, 17, 9], [9, 1, 17, 1, 17, 9], [9, 1, 17, 1, 17, 9, 9], [1, 17, 1, 17, 9, 9, 5, 13], [1, 17, 1, 17, 9, 9, 3, 9, 15], [1, 17, 1, 17, 9, 9, 5, 13, 5, 13]]

function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint16Array(buf))
}

function str2ab(str) {
    let buf = new ArrayBuffer(str.length*2)
    let bufView = new Uint16Array(buf)
    for (let i=0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i)
    }
    return buf
}

export default class {
    constructor(client = false){
        this.all_players = {}
        this.scores = {}
        this.state = 0
        this.client = client
        this.lobby = new RoomManager(ROWS, COLS, client)
        this.arena = new RoomManager(ROWS, COLS, client)
        this.time = 0
        this.color_choices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
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

    addEventDispatcher(cb){
        this.lobby.addEventHandler(cb)
        this.arena.addEventHandler(cb)
    }

    trigger(ev, args){
        if(this.callbacks[ev]){
            this.callbacks[ev].forEach(cb => {
                cb(args)
            })
        }
    }

    serialize(){
        let player_buffers = []
        let N = 1
        for(let id in this.all_players){
            let y = str2ab(id)

            let n = y.byteLength + 6
            let z = new ArrayBuffer(n)

            let size_view = new Uint16Array(z)
            size_view[0] = n
            size_view[1] = this.all_players[id]
            size_view[2] = this.scores[id]

            let byte_view = new Uint8Array(z, 6)
            byte_view.set(new Uint8Array(y))

            player_buffers.push(z)
            N += n
        }

        let lobby_buffer = this.lobby.serialize()
        let arena_buffer = this.arena.serialize()
        N += lobby_buffer.byteLength + 2
        N += arena_buffer.byteLength + 2

        let buffer = new ArrayBuffer(Math.ceil((22 + N)/4)*4)
        let float_view = new Float32Array(buffer)
        float_view[0] = this.time

        let short_view = new Uint16Array(buffer, 4)
        short_view[0] = this.state
        short_view[1] = this.cxmin
        short_view[2] = this.cxmax
        short_view[3] = this.cymin
        short_view[4] = this.cymax

        short_view[5] = this.cd
        short_view[6] = this.cx
        short_view[7] = this.cy
        short_view[8] = this.cn

        let byte_view = new Uint8Array(buffer, 22)
        byte_view[0] = player_buffers.length
        let o = 2
        player_buffers.forEach(b => {
            byte_view.set(new Uint8Array(b), o)
            o += b.byteLength
        })

        byte_view[o] = Math.floor(lobby_buffer.byteLength / 256)
        byte_view[o + 1] = lobby_buffer.byteLength % 256
        byte_view.set(new Uint8Array(lobby_buffer), o + 2)
        o += lobby_buffer.byteLength + 2

        byte_view[o] = Math.floor(arena_buffer.byteLength / 256)
        byte_view[o + 1] = arena_buffer.byteLength % 256
        byte_view.set(new Uint8Array(arena_buffer), o + 2)
        o += arena_buffer.byteLength + 2

        return buffer
    }

    deserialize(buffer){
        let float_view = new Float32Array(buffer)
        this.time = float_view[0]
        let short_view = new Uint16Array(buffer, 4)
        this.state = short_view[0]
        this.cxmin = short_view[1]
        this.cxmax = short_view[2]
        this.cymin = short_view[3]
        this.cymax = short_view[4]
        this.cd = short_view[5]
        this.cx = short_view[6]
        this.cy = short_view[7]
        this.cn = short_view[8]
        let byte_view = new Uint8Array(buffer, 22)
        let n_players = byte_view[0]
        let o = 2
        for(let i = 0; i < n_players; i++){
            let size_view = new Uint16Array(buffer, 22 + o)
            let n_bytes = size_view[0]
            let n_id = n_bytes - 6
            let player = size_view[1]
            let score = size_view[2]

            let id = ab2str(buffer.slice(22 + o + 6, 22 + o + 6 + n_id))
            
            if(this.all_players[id] === undefined){
                this.addPlayer(id)
            }
            this.all_players[id] = player

            this.scores[id] = score

            o += n_bytes
        }

        let n_lobby = byte_view[o]*256 + byte_view[o + 1]
        let lobby_buf = buffer.slice(22 + o + 2, 22 + o + 2 + n_lobby)
        this.lobby.deserialize(lobby_buf)
        o += n_lobby + 2

        let n_arena = byte_view[o]*256 + byte_view[o + 1]
        let arena_buf = buffer.slice(22 + o + 2, 22 + o + 2 + n_arena)
        this.arena.deserialize(arena_buf)
        o += n_arena + 2
    }

    addPlayer(id){
        if(this.numPlayers < 10){
            let c = this.color_choices.shift()
            let avatar = new Avatar(Math.floor(Math.random()*(this.lobby.cols - 7)) + 4, Math.floor(Math.random()*(this.lobby.rows - 5)) + 4, c)
            this.all_players[id] = c
            this.lobby.addPlayer(avatar)
            this.scores[id] = 0
        }
    }

    removePlayer(id){
        let c = this.all_players[id]
        if(c != undefined){
            var lai = this.lobby.players.findIndex(p => p.color == c)
            if(lai > -1){
                this.lobby.players.splice(lai, 1)
            }
            var aai = this.arena.players.findIndex(p => p.color == c)
            if(aai > -1){
                this.arena.players.splice(aai, 1)
            }
            this.color_choices.unshift(c)
            this.all_players[id] = undefined
            delete this.all_players[id]
        }
        delete this.scores[id]
    }

    handleInput(input){
        let c = this.all_players[input.player]
        let avatar = undefined
        if(this.state == 0){
            avatar = this.lobby.players.find(p => p.color == c)
        }else if(this.state == 1){
            avatar = this.arena.players.find(p => p.color == c)
        }

        if(avatar){
            if(input.press){
                if(input.x == 2){
                    avatar.dirs.push(4)
                    avatar.spd_sp = 1
                }else if(input.x == 0){
                    avatar.dirs.push(0)
                    avatar.spd_sp = 1
                }else if(input.x == 3){
                    avatar.dirs.push(6)
                    avatar.spd_sp = 1
                }else if(input.x == 1){
                    avatar.dirs.push(2)
                    avatar.spd_sp = 1
                }else if(input.x == 4){
                    var aai = this.arena.players.indexOf(avatar)
                    if(aai > -1){
                        this.arena.dropBomb(avatar)
                    }
                }
            }else{
                var ddi = -1
                if(input.x == 2){
                    ddi = avatar.dirs.indexOf(4)
                    avatar.last_dir = 4
                }else if(input.x == 0){
                    ddi = avatar.dirs.indexOf(0)
                    avatar.last_dir = 0
                }else if(input.x == 3){
                    ddi = avatar.dirs.indexOf(6)
                    avatar.last_dir = 6
                }else if(input.x == 1){
                    ddi = avatar.dirs.indexOf(2)
                    avatar.last_dir = 2
                }
                if(ddi > -1){
                    avatar.dirs.splice(ddi, 1)
                }
                
                if(avatar.dirs.length == 0){
                    avatar.spd_sp = 0
                }
            }
        }
    }

    startGame(){
        this.lobby.clearAll()
        this.arena.clearAll()
        if(!this.client){
            this.arena.fireEvent('toArena')
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
            let c = this.all_players[id]
            this.arena.addPlayer(new Avatar(spawnx.pop(), spawny.pop(), c))
        }

        // randomly pick up to 6 blocks and replace them with teleporters
        let num_teleporters = Math.round(Math.random()*3)
        for(let i = 0; i < num_teleporters && this.arena.blocks.length > 2; i++){
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
            let c = this.all_players[id]
            if(this.lobby.players.findIndex(p => p.color == c) < 0){
                let avatar = new Avatar(Math.floor(Math.random()*(this.lobby.cols - 7)) + 4, Math.floor(Math.random()*(this.lobby.rows - 5)) + 4, c)
                avatar.max_bombs = 0
                this.lobby.addPlayer(avatar)
            }
        }
        if(!this.client){
            this.lobby.fireEvent('toLobby')
        }
    }

    update(dt){
        if(this.state == 1){
            if(this.arena.players.length <= 1){
                this.state = 2
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
            
        }else if(this.state == 2){
            if(this.time > 100){
                this.state = 0
                this.time = 0
                var winners = [...this.arena.players]
                winners.forEach((p) => {
                    for(var id in this.all_players){
                        if(p.color == this.all_players[id]){
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
            
        }else if(this.state == 0){
            var ready = 0
            this.lobby.players.forEach((p) => {
                if(p.y <= 3){
                    ready += 1;
                }
            })
            if(this.numPlayers > 1 && ready >= this.numPlayers){
                this.state = 1
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
