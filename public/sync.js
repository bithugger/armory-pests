export const ts = {
    interval: 1500,
    error: 0,
    offset: 0,
    ping_time: 0,
    lat_err_list: [],
    steady_counter: 0,

    get now(){
        return Date.now() + ts.offset
    },

    get local(){
        return Date.now()
    },

    ping: () => {
        ts.ping_time = Date.now()
    },

    correct: (server_time) => {
        const time_now = Date.now()
        const one_way_lat = (time_now - ts.ping_time)/2
        const server_time_at_ping = server_time - one_way_lat

        ts.error = server_time_at_ping - ts.ping_time
        ts.lat_err_list.push({lat: one_way_lat, err: ts.error, time: server_time})
        ts.lat_err_list.sort((a, b) => {
            return (a.lat - b.lat) + ((time_now - a.time) - (time_now - b.time))/ts.interval
        })

        if(ts.lat_err_list.length > 6){
            ts.lat_err_list.splice(6, ts.lat_err_list.length - 6)
        }

        let average_error = 0
        for(let e of ts.lat_err_list){
            average_error += e.err
        }
        average_error /= ts.lat_err_list.length

        let doffset = average_error - ts.offset
        ts.offset = average_error

        if(Math.abs(doffset) < 2){
            ts.steady_counter++
        }else{
            ts.steady_counter = 0
        }

        if(ts.steady_counter < 5){
            ts.interval = 5000
        }else{
            ts.interval = 1000
        }
    }


}