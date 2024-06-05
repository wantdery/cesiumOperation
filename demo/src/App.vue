<template>
  <div id="cesiumContainer"></div>
  <router-view></router-view>
</template>

<script setup>
import * as Cesium from "cesium";
import { ref, onMounted,getCurrentInstance } from "vue";
import CesiumZh from "./tool/cesiumToZh";
import * as turf from "@turf/turf";
import { load3dtiles, update3dtiles } from "./tool/load3D";
const { appContext } = getCurrentInstance();
const global = appContext.config.globalProperties;
//组件先挂载到页面，地图再实例化到组件中
Cesium.Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIwZWI2YTk3ZC1mZWI4LTQyMDUtYmI1Ny00YzFkYTFmYmIwYzIiLCJpZCI6MjE3MTU4LCJpYXQiOjE3MTY0Mjc1MDZ9.dC3r6S37sujU0HyCKe-k_flKuGM9kyy_oqkd9eQutZs";
let viewer, entity, handler;
onMounted(() => {
  //viewer是操作地图api的开始
  viewer = new Cesium.Viewer("cesiumContainer", {
    timeline: false,
    animation: false,
    infoBox: false,
    selectionIndicator: false,
  });
  global.$viewer = viewer;
  CesiumZh.load();
  load3dtiles(viewer, "/src/assets/b3dm/Tile_+002_+005/tileset.json", (tileset) => {  
    //src/assets/b3dm/Tile_+002_+005/tileset.json
    update3dtiles(tileset); ///src/assets/b3dm/tileset.json
    viewer.zoomTo(tileset);
  });
});
</script>

<style scoped>
#cesiumContainer {
  width: 100vw;
  height: 100vh;
  /* position: absolute; */
  overflow: hidden;
}
#btn {
  position: absolute;
  top: 100px;
  left: 100px;
  z-index: 999;
}
</style>

