export function getRandomNumber(max=1, min=0, isInt=false) {
    let val = isInt ? Math.floor(Math.random() * (max - min) + min) : Math.random() * (max - min) + min;
    return val;
}