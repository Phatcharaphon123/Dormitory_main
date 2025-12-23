const { InfluxDB } = require('@influxdata/influxdb-client');
const dotenv = require('dotenv');
const { DateTime } = require('luxon');

dotenv.config();

const url = process.env.INFLUX_URL;
const token = process.env.INFLUX_TOKEN;
const org = process.env.INFLUX_ORG;
const bucket = process.env.INFLUX_BUCKET;

const influxDB = new InfluxDB({ url, token });
const queryApi = influxDB.getQueryApi(org);

async function fetchSensorDormitoryLatest() {
    const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: -2h)
      |> filter(fn: (r) => r._measurement == "Dormitory_01")
      |> last()
  `;

    const results = [];

    return new Promise((resolve, reject) => {
        queryApi.queryRows(fluxQuery, {
            next(row, tableMeta) {
                const o = tableMeta.toObject(row);
                results.push({
                    field: o._field,
                    value: o._value,
                    time: o._time
                });
            },
            error(error) {
                console.error("INFLUX ERROR:", error);
                reject(error);
            },
            complete() {
            const map = new Map();

            for (const { field, value, time } of results) {
                if (!time) continue;                         // โดยปกติ Influx จะมี _time เสมอ
                if (!map.has(time)) map.set(time, { time }); // เก็บ time ไว้ในอ็อบเจ็กต์เดียวกัน
                map.get(time)[field] = value;                // รวม field เป็นคอลัมน์เดียวกัน
            }

            const resultArray = Array.from(map.values())
                .map(r => ({
                time: r.time
                    ? DateTime.fromISO(r.time)               // _time เป็น ISO ไม่ใช่วินาที
                        .setZone('Asia/Bangkok')
                        .toISO({ suppressMilliseconds: true })
                    : null,
                power: r.power ?? null,
                water: r.water ?? null,
                }))
                .sort((a, b) => (a.time > b.time ? 1 : -1)); // อยากเรียงเวลาก็ได้

            resolve(resultArray);
            }
        });
    });
}

async function fetchSensorDormitory() {
    const fluxQuery = `
    from(bucket: "${bucket}")
            |> range(start: 2025-09-14T00:00:00Z, stop: now())
            |> filter(fn: (r) => r._measurement == "Dormitory_01")
        `;

    const results = [];

    return new Promise((resolve, reject) => {
        queryApi.queryRows(fluxQuery, {
            next(row, tableMeta) {
                const o = tableMeta.toObject(row);
                results.push({
                    field: o._field,
                    value: o._value,
                    time: o._time
                });
            },
            error(error) {
                console.error("INFLUX ERROR:", error);
                reject(error);
            },
            complete() {
            const map = new Map();

            for (const { field, value, time } of results) {
                if (!time) continue;                         // โดยปกติ Influx จะมี _time เสมอ
                if (!map.has(time)) map.set(time, { time }); // เก็บ time ไว้ในอ็อบเจ็กต์เดียวกัน
                map.get(time)[field] = value;                // รวม field เป็นคอลัมน์เดียวกัน
            }

            const resultArray = Array.from(map.values())
                .map(r => ({
                time: r.time
                    ? DateTime.fromISO(r.time)               // _time เป็น ISO ไม่ใช่วินาที
                        .setZone('Asia/Bangkok')
                        .toISO({ suppressMilliseconds: true })
                    : null,
                power: r.power ?? null,
                water: r.water ?? null,
                }))
                .sort((a, b) => (a.time > b.time ? 1 : -1)); // อยากเรียงเวลาก็ได้

            resolve(resultArray);
            }

        });
    });
}

module.exports = {
    fetchSensorDormitoryLatest,
    fetchSensorDormitory
};