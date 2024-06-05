<template>
  <el-card class="setbuild">
    <template #header>
      <div class="card-header">
        <span style="font-weight: 600; font-size: 18px">楼房分户</span>
      </div>
    </template>
    <div>
      <el-steps finish-status="success" :active="data.active" align-center>
        <el-step title="区域绘制" />
        <el-step title="户型切分" />
        <el-step title="楼房分层" />
      </el-steps>
      <div style="margin:30px 10px">
        <div style="height:40px">
          <span>绘制户型：</span>
          <span @click="drawPolygon" class="myIcon" v-show='data.active==0'>
            <FullScreen />
            绘制图形
          </span>
          <span @click="drawLine" class="myIcon" v-show='data.active==1'>
            <Scissor />
            裁切图形
          </span> <span class="myIcon" v-show='data.active==2'>
            <Histogram />
            楼层分层
          </span>
        </div>
        <div class="textInput">
          <el-input v-model="inputArr[0]" />
          <el-input v-model="inputArr[1]" />
          <el-input style="width: 40%;" v-model="inputArr[2]" />
          <el-input v-show="data.active==1" style="width: 40%;" v-model="inputArr[3]" />
        </div>
        <div class="textInput" v-for="(item,index) in data.unitArr" :key="index">
          <el-input v-model="item[0]" disabled />
          <el-input v-model="data.buildName" />
          <el-input style="width: 40%;" v-model="item[1]" />
          <img @click="toFlash(item[2])" v-show="data.active==1" src="/src/assets/img/position.png">
        </div>
        <el-button type="info" v-if="data.active<2" @click="next" style="margin:12px;float:right">下一步</el-button>
        <el-button type="success" v-else @click="toLayer" style="margin:12px;float:right">楼房分层</el-button>
      </div>
    </div>
  </el-card>
</template>
<script setup>
import * as Cesium from 'cesium'
import { reactive, getCurrentInstance } from 'vue'
import { toDraw, endDraw } from '../tool/draw'
import * as turf from '@turf/turf'
import polygonCut from '../tool/polygonCut'
const { appContext } = getCurrentInstance()
const global = appContext.config.globalProperties
import { ElMessage } from 'element-plus'
import {
  FullScreen,
  Scissor,
  Histogram,
  Refresh,
} from "@element-plus/icons-vue";
const inputArr = ['分户坐标', '地址前缀', '单位', '定位']
const data = reactive({
  active: 0,
  unitArr: [],
  buildName: 'xx小区xx栋'
})
let polygonEntity, polygonGeojson
const toLayer = () => {
  data.active = 3
}

const toFlash = (entity) => {
  let initColor = entity.polygon.material.color._value
  let x = 1;
  let flog = true;
  entity.polygon.material = new Cesium.ColorMaterialProperty(new Cesium.CallbackProperty(() => {
    if (flog) {
      x = x - 0.05;
      if (x <= 0) {
        flog = false;
      }
    } else {
      x = x + 0.05;
      if (x >= 1) {
        flog = true;
      }
    }
    return Cesium.Color.RED.withAlpha(x);
  }, false))
  setTimeout(() => {
    entity.polygon.material = initColor
  }, 1500)
}

const next = () => {
  if (data.active == 0 && !polygonEntity) {
    ElMessage.info('请先绘制区域！')
    return
  } else if (data.active == 1) {
    endDraw()
  }
  data.active++
}

const drawLine = () => {
  ElMessage.info('请绘制图形,右键结束绘制')
  global.$viewer.entities.removeAll()
  global.$viewer.entities.add(polygonEntity)
  data.unitArr = [[polygonGeojson.geometry.coordinates.toString(), 1, polygonEntity]]
  toDraw(global.$viewer, 'line', (res) => {
    global.$viewer.entities.remove(res)
    let car3_ps = res.polyline.positions._value
    let arr = []
    for (let i = 0; i < car3_ps.length; i++) {
      let _cartographic = Cesium.Cartographic.fromCartesian(car3_ps[i]);
      let _lat = Cesium.Math.toDegrees(_cartographic.latitude);
      let _lng = Cesium.Math.toDegrees(_cartographic.longitude);
      arr.push([_lng, _lat]);
    }
    const lineGeojson = turf.lineString(arr);
    let polygonCollection
    try {
      polygonCollection = polygonCut(polygonGeojson, lineGeojson)
      if (polygonCollection.features.length == 1) {
        ElMessage.error('请切割区域！')
        return
      }
    } catch (error) {
      ElMessage.error(error)
      return
    }
    Cesium.GeoJsonDataSource.load(polygonCollection, { clampToGround: true }).then(info => {
      global.$viewer.entities.removeAll()
      data.unitArr = []
      info.entities.values.forEach((item, index) => {
        item.polygon.material = Cesium.Color.fromRandom({ alpha: 0.5 })
        global.$viewer.entities.add(item)
        data.unitArr.push([
          polygonCollection.features[index].geometry.coordinates.toString(),
          data.unitArr.length + 1,
          item
        ])
      })
    })
  })
}

const drawPolygon = () => {
  ElMessage.info('请绘制图形,右键结束绘制')
  global.$viewer.entities.removeAll()
  data.unitArr = []
  polygonEntity = null
  toDraw(global.$viewer, 'polygon', (res) => {
    polygonEntity = res
    let car3_ps = res.polygon.hierarchy._value.positions
    let arr = []
    for (let i = 0; i < car3_ps.length; i++) {
      let _cartographic = Cesium.Cartographic.fromCartesian(car3_ps[i]);
      let _lat = Cesium.Math.toDegrees(_cartographic.latitude);
      let _lng = Cesium.Math.toDegrees(_cartographic.longitude);
      arr.push([_lng, _lat]);
    }
    arr.push(arr[0])
    polygonGeojson = turf.polygon([arr]);
    data.unitArr.push([
      polygonGeojson.geometry.coordinates.toString(),
      1,
      res
    ])
  })
}

</script>
<style lang="scss">
.setbuild {
  width: 25%;
  position: absolute;
  top: 4%;
  left: 4%;
  z-index: 999;

  .buildnum {
    float: right;
    width: 34%;

    .el-input {
      width: 50%;
    }
  }

  .myIcon {
    cursor: pointer;

    svg {
      width: 20px;
      position: relative;
      top: 5px;
      margin-right: 3px;
    }
  }

  .textInput {
    display: flex;

    .el-input {
      margin: 5px 1%;

      .el-input__inner {
        text-align: center;
      }
    }

    img {
      margin: 10px 4.6%;
      width: 14%;
      height: 25px;
      cursor: pointer;
    }
  }

  .pointList {
    display: flex;
    font-size: 15px;
    margin: 20px 0;
    line-height: 30px;

    .el-input {
      width: 15%;
      margin-right: 4%;
    }
  }
}
</style>
