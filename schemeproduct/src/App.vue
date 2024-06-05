<template>
  <div>
    <div id="cesiumContainer"></div>
    <router-view></router-view>
  </div>
</template>

<script setup>
import * as Cesium from "cesium";
import * as turf from "@turf/turf";
import {
  ref,
  onMounted,
  getCurrentInstance,
  watch,
  onUnmounted,
  computed,
} from "vue";

const { appContext } = getCurrentInstance();
const global = appContext.config.globalProperties;

Cesium.Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIwZWI2YTk3ZC1mZWI4LTQyMDUtYmI1Ny00YzFkYTFmYmIwYzIiLCJpZCI6MjE3MTU4LCJpYXQiOjE3MTY0Mjc1MDZ9.dC3r6S37sujU0HyCKe-k_flKuGM9kyy_oqkd9eQutZs";
let viewer;
onMounted(() => {
  //viewer是操作地图api的开始
  const layer = new Cesium.UrlTemplateImageryProvider({
    url: "http://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}",
    minimumLevel: 4,
    maximumLevel: 18,
  });
  viewer = new Cesium.Viewer("cesiumContainer", {
    timeline: false,
    animation: false,
    infoBox: false,
    selectionIndicator: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    geocoder: false,
    homeButton: false,
    navigationHelpButton: false,
    sceneModePicker: false,
  });
  const tileset = viewer.scene.primitives.add(
    new Cesium.Cesium3DTileset({
      url: Cesium.IonResource.fromAssetId(69380),
    })
  );
  global.$viewer = viewer;
  viewer.flyTo(tileset);
});
</script>

<style lang="scss" scope>
#cesiumContainer {
  width: 100vw;
  height: 100vh;
  /* position: absolute; */
  overflow: hidden;
  z-index: -1;
}
</style>
