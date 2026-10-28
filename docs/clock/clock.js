const DATELINE_MERIDIAN = -169;
const STALP_TIME_ZONES = 12;
const BASE_12_GLYPHS = "0123456789AB";
const POINT_GLYPH = ";";

const LONGITUDE_OBJ = document.getElementById("longitude");
const LONGITUDE_WARN = document.getElementById("longitude-warn");
const CLOCK_OBJ = document.getElementById("clock");

function dozenalFrac(value, precision) {
    // Convert the range [-inf, info] to the range [0.0, 1.0).
    value = ((value % 1) + 1) % 1;

    let result = [];
    for (let i = 0; i < precision; i++) {
        value *= 12;
        const digit = Math.floor(value);
        result.push(BASE_12_GLYPHS[digit]);
        value -= digit;
    }

    return POINT_GLYPH + result.join("");
}

function datelineLmst(utc) {
    return new Date(utc.getTime() + (DATELINE_MERIDIAN / 15) * 3600000);
}

function degreesWest(longitude) {
    return (DATELINE_MERIDIAN - longitude + 360) % 360;
}

function stalpTimezone(longitude) {
    const degrees = degreesWest(longitude);
    const zone = Math.floor(degrees / (360 / 12));
    return -zone / 12;
}

function dayFractional(date) {
    return (
        date.getUTCHours() / 24 +
        date.getUTCMinutes() / 1440 +
        date.getUTCSeconds() / 86400 +
        date.getUTCMilliseconds() / 86400000
    );
}

function dayOfYear(date, yearStart) {
    return Math.floor(
        (Date.UTC(
            date.getUTCFullYear(),
            date.getUTCMonth(),
            date.getUTCDate()
        ) - yearStart) / 86400000
    );
}

function stalpTime(utc, longitude, precision) {
    const lmst = datelineLmst(utc);
    const zone_offset = stalpTimezone(longitude);

    const adjusted = new Date(lmst.getTime() + zone_offset * 86400000);

    // STALP year begins December 22nd.
    const calendarYear = adjusted.getUTCFullYear();
    const thisYearStart = Date.UTC(calendarYear, 11, 22);

    const stalpYear = adjusted.getTime() >= thisYearStart ?
        calendarYear :
        calendarYear - 1;

    const yearStart = Date.UTC(stalpYear, 11, 22);
    const doy = dayOfYear(adjusted, yearStart);

    const zone = zone_offset * STALP_TIME_ZONES;

    const month = Math.floor(doy / 28) + 1;
    const day = (doy % 28) + 1;
    const dayFrac = dozenalFrac(dayFractional(adjusted), precision);

    return [month, `${day}${dayFrac}`, zone];
}

function update() {
    const longitude = Number(LONGITUDE_OBJ.value);
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        CLOCK_OBJ.innerHTML = "Invalid longitude";
        return;
    }
    const utc = new Date();
    const [month, day, zone] = stalpTime(utc, longitude, 5);
    CLOCK_OBJ.innerHTML = `Month ${month}; Day ${day} Zone -;${Math.abs(zone)}`
}

let manualLongitude = false;

LONGITUDE_OBJ.addEventListener("input", () => {
    manualLongitude = true;
    LONGITUDE_WARN.style.display = "none";
})

update();
setInterval(update, 100);

if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
        (position) => {
            if (manualLongitude) return;
            LONGITUDE_OBJ.value = position.coords.longitude;
            LONGITUDE_WARN.style.display = "none";
            update();
        },
        (error) => {
            console.warn("Could not obtain location:", error.message);
        }
    );
}
