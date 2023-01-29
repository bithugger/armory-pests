class Particle {
    constructor(x, y, vx, vy, size, time = 50, period = 15){
        this.x = x
        this.y = y
        this.vx = vx
        this.vy = vy
        this.size = size
        this.time = time
        this.period = period
        this.phase = random(-PI, PI)
    }

    update(dt){
        this.x += this.vx*dt*0.02
        this.y += this.vy*dt*0.02
        this.time -= dt
    }

    draw(){
        push()
        let c = color(255, 255*Math.tanh(this.time/3))
        let r = this.size*Math.tanh(this.time/5)
        let a = Math.abs(this.phase)
        let s = Math.sign(this.phase)
        if(this.period > 0){
            a += s*this.time*2*PI/this.period
        }
        translate(this.x, this.y)
        rotate(a)
        stroke(c)
        noFill()
        rectMode(CENTER)
        rect(0, 0, r, r)
        pop()
    }
}

export default class {
    constructor(tile_size){
        this.particles = []
    }
    
    add(x, y, vx, vy, size, time, period){
        let p = new Particle(x, y, vx, vy, size, time, period)
        this.particles.push(p)
    }

    update(dt){
        this.particles.forEach((p) => {
            p.update(dt)
        })
        for(let i = this.particles.length - 1; i >= 0; i--){
            if(this.particles[i].time <= 0){
                this.particles.splice(i, 1)
            }
        }
    }

    clear(){
        this.particles = []
    }

    draw(){
        push()
        this.particles.forEach((p) => {
            p.draw()
        })
        pop()
    }
}