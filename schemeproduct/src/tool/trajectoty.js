import * as Cesium from "cesium";

const getSiteTime = (pArr, speed) => {
  let timeSum = 0, //timeSum花费时间总和，每一个轨迹点对应的时间
    times = [];
  for (let i = 0; i < pArr.length; i++) {
    if (i === 0) {
      times.push(0);
      continue;
    }
    timeSum += spaceDistance(pArr[i - 1], pArr[i]) / speed;
    times.push(timeSum);
  }
  return { timeSum: timeSum, siteTime: times };
};

const spaceDistance = (a, b) => {
  return Cesium.Cartesian3.distance(a, b).toFixed(2);
};

const getSampleData = (pArr, start, siteTime) => {
  const position = new Cesium.SampledPositionProperty();
  for (let i = 0; i < pArr.length; i++) {
    const time = Cesium.JulianDate.addSeconds(
      start,
      siteTime[i],
      new Cesium.JulianDate()
    ); //每一个轨迹点所对应的系统时间
    position.addSample(time, pArr[i]);
  }
  return position;
  console.log(position);
};
export { getSiteTime, getSampleData, spaceDistance };
