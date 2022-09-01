let video;
let poseNet;
let retrievedPoses = [];
let eyeDistOffset;
let thresholdOffset = 0.5;
let jumpScale = 1.0;
let vidGraphics;
let clickCounter =0;
let fullText;
let textIndex = 0;
let textDir = 1;
let currentText;
let textGraphics;
let isAnimating = false;
let vid;
let button;
let originalVideoCheck, bodyAbstractionCheck, textAnimationCheck, jumpAnimationCheck, isFoundJumpPose;
let isOriginalVideo, isBodyAbstraction, isTextAnimation, isJumpAnimation, isJumpCursor,isJumpPlaceHolder,isChaningStringText, isClearJumpGraphics;
let textAreaAnimation, textThresholdSlider, jumpScaleSlider, jumpOrganListForm,
textOrganListInput, switchCheckCursorJump,switchLabelCursorJump,switchLabelStringText,
switchCheckStringText,abstractionOrganListInput,vidPlay,jumpFadeSlider,jumpAddons,textAddons,absractAddons;
let textThreshold = 0.01;
const possiblePoses = ["nose", "leftEye", "rightEye", "leftShoulder", "rightShoulder","fullBody"];
// const possiblePoses = ["fullBody"];
let jumpChosenPoses = [];
let textChosenPoses = [];
let abstractionChosenPoses  = [];
let fullBodyGraphics, maskGraphics, fullBodyGraphicsMasked, bodyAbstractionGraphics;
let fullBodyPosesToGrab = [];
let currentCanvas;
let fullBodyVecHolder, viewingScale =1.25;
let confidenceThreshold = 0.7;
let currentPixelDensity;
let jumpAlphaFade = 255;
let numOfBodies = 4;
let startButton, mic, fft, selectCam;
const microMinute = 60000;
const displayStates = [];
const possibleText = [
  "haven't we been there before?",
  "am i your error?",
  // "have we met before?",
  // "where do i know u from?",
  "have u always been carried by this body?",
  "in this eyes's dream",
  "can u here the ear?"
]
// const gpu = new GPU();

const vidConstrains = {
  audio:false,
  video: {
    deviceId: '',
    // facingMode: 'user',
    mandatory: {
      // minWidth: window.innerWidth,
      // minHeight: window.innerHeight,
      maxWidth: window.innerWidth,
      maxHeight: window.innerHeight
    }
}
}

const gpuSettings = {
  output: {x: window.innerHeight*window.innerWidth, y: window.innerHeight*window.innerWidth, z: window.innerHeight*window.innerWidth}
}
const poseNetOptions = 
  {
    architecture: 'MobileNetV1',
    imageScaleFactor: 0.3,
    outputStride: 16,
    flipHorizontal: true,
    minConfidence: 0.5,
    maxPoseDetections: 100,
    scoreThreshold: 0.25,
    nmsRadius: 20,
    detectionType: 'multiple',
    inputResolution: 513,
    multiplier: 0.75,
    quantBytes: 2,
  }


function canvasInit () {
  currentCanvas  = createCanvas(window.innerWidth, window.innerHeight,P2D);
  // console.log(currentCanvas);
  // currentCanvas.canvas.append(video);
  viewingScale = window.innerHeight/video.height;
  fullBodyVecHolder  = createVector(-100,-100);  
  background(255);
  ellipseMode(CENTER);
  vidGraphics = createGraphics(video.width, video.height);
  textGraphics = createGraphics(width,height);
  bodyAbstractionGraphics = createGraphics(width,height);
  fullBodyGraphics = createGraphics(vidGraphics.width,vidGraphics.height);
  fullBodyGraphicsMasked = createGraphics(fullBodyGraphics.width,fullBodyGraphics.height)
  maskGraphics = createGraphics(fullBodyGraphics.width,fullBodyGraphics.height);
  // video.hide();
  poseNet  = ml5.poseNet(video,poseNetOptions,modelLoaded)  ;
  setInterval(()=>eyeDistOffset = random(0.5,3),250);
  // setTimeout(()=>setInterval(()=>thresholdOffset = random(0.2,0.4),250),100);
}


function setup() {
  frameRate(30);
  isOriginalVideo = false;
  currentPixelDensity = pixelDensity();
  isClearJumpGraphics = false;
  displayStates.push({name: "TextAnimation", bool: Boolean(Math.random()<0.5), poses: []});
  displayStates.push({name:"JumpAnimation",bool: true, poses: []});
  displayStates.push({name:"BodyAbstraction",bool: Boolean(Math.random()<0.5), poses: []});
  startButton = document.getElementById('startButton');
  console.log(startButton)
  startButton.onclick = ()=> startButtonHandler();
}

const startButtonHandler = () => {
  startButton.style.display = 'none';
  document.getElementById('buttonContainer').style.display = 'none';
  // video = createCapture(vidConstrains,canvasInit);
  mediaHandler();
}

const mediaHandler = () => {
  if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
    console.log("Let's get this party started")
  }
  selectCam = document.getElementById('selectCam');
  navigator.mediaDevices.enumerateDevices()
  .then((devices) => {
    videoDevices = devices.filter(device=> device.kind==='videoinput');
    videoDevices.forEach(device=> {
      let currentOption = document.createElement('option');
      currentOption.value = device.label;
      currentOption.id = device.id;
      currentOption.innerText = device.label;
      selectCam.append(currentOption);
    })
    selectCam.style.display = 'block';
    selectCam.onchange = () => {
      selectCam.style.display = 'none';
      vidConstrains.video.deviceId = selectCam.value.id;
      userStartAudio();
      mic = new p5.AudioIn();
      mic.start();
      fft = new p5.FFT();
      video = createCapture(vidConstrains,canvasInit);
      // navigator.mediaDevices.getUserMedia(vidConstrains)
      // .then((stream) => {
        
      //   // document.createElement('video');
      //   // video.srcObject = stream;
      //   // canvasInit();
      //   /* use the stream */
      // })
      // .catch((err) => {
      //   alert(err);
      //   /* handle the error */
      // });

    }
    // console.log()
    // console.log(videoDevices);
    // console.log(devices);
  })
  .catch((err) => {
    console.error(err);
    /* handle the error */
  });

}


const jumpCanvasClick = ()=> {
  if(!isJumpPlaceHolder) {
    isJumpPlaceHolder = true;
    fullBodyVecHolder = createVector(mouseX,mouseY);
  } else {
    isJumpPlaceHolder = false;
    fullBodyVecHolder = createVector(-100,-100);
    console.log(fullBodyVecHolder);
  }
}

const loadPoseNet = () => {
  poseNet  = ml5.poseNet(video,modelLoaded)  ;
  poseNet.on('pose', gotPoses);
}
const gotPoses = (poses) =>{
  if (poses.length > 0) {
    retrievedPoses  =  poses.filter((pose,index)=>index<numOfBodies&&pose);
    // console.log(retrievedPoses);
  }
  
}
const modelLoaded  = () => {
  console.log('model ready!');
  poseNet.on('pose', gotPoses);
  toggleStates();
}

const textAnimation = (keyPoints) => {
  // console.log(keyPoints);
  textGraphics.textAlign(CENTER);
  if  (isChaningStringText) {
  if (frameCount%60==0) {
    if (textIndex > fullText.split(' ').length-1){
      textDir  =  -1;
      textIndex --;
    } else if (textIndex < 0) {
      textDir = 1;
      textIndex ++;
    } else {
    textIndex += textDir;
  }
  }
}
  currentText = fullText.split(' ',textIndex).join(' ');
  // console.log(currentText);
  textChosenPoses.map(pose=> {
    keyPoints.map(keypoint=>{
      if (keypoint.part == pose) {
        if (keypoint.score > 0.6) {
  if (keypoint.position.x > (width*textThreshold)) {
    frameCount % 5 == 0 && textGraphics.clear();
    textGraphics.fill(23,23,23,100);
    textGraphics.stroke(230);
    textGraphics.strokeWeight(random(1,2));
    textGraphics.textSize(20);
    textGraphics.text(currentText,keypoint.position.x*viewingScale,keypoint.position.y*viewingScale);
    
  } else {
    if (!isAnimating) {
    animatingText(keypoint.position.x*viewingScale,keypoint.position.y*viewingScale,millis());
  }
  
  }
}
}
})
})
}

const jumpAnimation = (pose,keyPoints)=> {
  let isFullBodyGrabbing = false
  let eyeR = pose.rightEye;
  let eyeL = pose.leftEye;
  let eyesDistance = dist(eyeR.x, eyeR.y, eyeL.x,eyeL.y);
  jumpChosenPoses.map((pose,poseIndex)=> {
    if (pose === "fullBody") {
      isFullBodyGrabbing = true;
    }
    keyPoints.map(keyPoint=> {
      if (keyPoint.part == pose) {
        if (keyPoint.score > 0.6) {
        
        let currentWidth = floor(eyesDistance);
        let currentHeight = floor(eyesDistance);
        let currentGraphics = createGraphics(currentWidth,currentHeight);
        currentGraphics.fill(0,255,0);
        currentGraphics.ellipseMode(CENTER);
        currentGraphics.ellipse(currentGraphics.width/2,currentGraphics.height/2,currentWidth*0.75,currentHeight);
        if (currentWidth > 0 && currentHeight >  0) {
        let currentImage = createImage(currentWidth,currentHeight);
        imageMode(CENTER);
        currentImage = vidGraphics.get(keyPoint.position.x-currentWidth/2,keyPoint.position.y-currentHeight/2,currentWidth,currentHeight);
        currentImage.mask(currentGraphics);
        if (!isJumpCursor) {
          image(currentImage, keyPoint.position.x*viewingScale,keyPoint.position.y*viewingScale,currentImage.width*jumpScale*viewingScale,currentImage.height*jumpScale*viewingScale);
        } else {
          imageMode(CENTER);
          if (isJumpPlaceHolder) {
            image(currentImage, fullBodyVecHolder.x-currentWidth/2*poseIndex,fullBodyVecHolder.y,currentImage.width*jumpScale*viewingScale,currentImage.height*jumpScale*viewingScale);
          }  else {
          image(currentImage, mouseX-currentWidth/2*poseIndex,mouseY,currentImage.width*jumpScale*viewingScale,currentImage.height*jumpScale*viewingScale);
         }
        }
      }
        imageMode(CORNER);
        }
      }
    });
  });
  if (isFullBodyGrabbing) {
    fullBodyGrabbing(pose);
  } else {
    if (fullBodyGraphics!=null) {
    fullBodyGraphics.clear();
  }
  }
  image(textGraphics,0,0);

}

const bodyAbstraction = (pose,skeleton,keyPoints) => {
  // console.log('body abstraction')
  let micLevel, wavefrom;
  let bodyFillRGBA = {
    red: 50+frameCount%20,
    green: 10+frameCount%56,
    blue: 150-frameCount%30,
    alpha: random(200,255)
  }
  if (mic !== null) {
    micLevel = mic.getLevel()*2;
    wavefrom = fft.waveform();
    // console.log(wavefrom);
    // console.log(micLevel);
    if (frameCount%6 === 0) {
    bodyFillRGBA = {
      red: lerp(25,50,micLevel)+frameCount%20,
      green: lerp(0,10,micLevel)+frameCount%56,
      blue: lerp(20,150,micLevel)-frameCount%30,
      alpha: random(200,255)
    }
    // bodyFillColor = color(bodyFillRGBA.red,bodyFillRGBA.green,bodyFillRGBA.blue,bodyFillRGBA.alpha);
  }
  }
  let eyeR = pose.rightEye;
  let eyeL = pose.leftEye;
  let eyesDistance = dist(eyeR.x, eyeR.y, eyeL.x,eyeL.y);
  bodyAbstractionGraphics.stroke(0);
  frameCount % 2 == 0 && bodyAbstractionGraphics.clear();
  bodyAbstractionGraphics.fill(255,random(20),random(20),isOriginalVideo ? random(20,70):random(100,150));
  abstractionChosenPoses.map(abstractionPose=> {
    keyPoints.map(keypoint=>{
      if (keypoint.part == abstractionPose) {
        if (keypoint) {
          bodyAbstractionGraphics.ellipse(keypoint.position.x*viewingScale,keypoint.position.y*viewingScale,eyesDistance*random(0.95,1.05),eyesDistance*random(0.95,1.05));
      }
      }
    })
  })
  bodyAbstractionGraphics.fill(bodyFillRGBA.red,bodyFillRGBA.green,bodyFillRGBA.blue,bodyFillRGBA.alpha);
  // bodyAbstractionGraphics.strokeWeight(random(1,3));
  bodyAbstractionGraphics.beginShape()
  skeleton.map((pnt)=> {
    let a = pnt[0];
    let b = pnt[1];
    bodyAbstractionGraphics.stroke(23);
    bodyAbstractionGraphics.strokeWeight(random(3));
    bodyAbstractionGraphics.line (a.position.x*viewingScale,a.position.y*viewingScale,b.position.x*viewingScale,b.position.y*viewingScale);
    bodyAbstractionGraphics.curveVertex(a.position.x*viewingScale,a.position.y*random(0.99,1.01)*viewingScale);
    bodyAbstractionGraphics.curveVertex(b.position.x*viewingScale,a.position.y*viewingScale);
  })
  bodyAbstractionGraphics.endShape(CLOSE);
  image(bodyAbstractionGraphics,0,0);
}


const fullBodyGrabbing = (pose) => {
  if(isClearJumpGraphics == true) {
    fullBodyGraphics.clear();
  }
  fullBodyGraphicsMasked.clear();
  let currentPoseToGrag;
  let torsoWidth = 0;

  if (pose.leftEye.confidence > confidenceThreshold && pose.rightEye.confidence>confidenceThreshold) {
  let eyeDistance = dist(pose.leftEye.x,pose.leftEye.y,pose.rightEye.x,pose.rightEye.y);
  let faceWidth = floor(eyeDistance*3.25);
  let faceHeight = floor(eyeDistance*4.5);
  let facePoseGrabbing = createVector(pose.leftEye.x*0.9,pose.leftEye.y*0.75);
  if (faceWidth > 0 &&  faceHeight >0) {
    currentPoseToGrag  = new  PoseToGrb (facePoseGrabbing.x,facePoseGrabbing.y,faceWidth,faceHeight);
    fullBodyPosesToGrab.push(currentPoseToGrag);
  }
}

if (pose.leftShoulder.confidence > confidenceThreshold && pose.rightShoulder.confidence  > confidenceThreshold) {
  let shouldDistance = dist(pose.leftShoulder.x,pose.leftShoulder.y,pose.rightShoulder.x,pose.rightShoulder.y);
  let shoulderHipDistance = dist(pose.leftShoulder.x,pose.leftShoulder.y,pose.leftHip.x,pose.leftHip.y,)
  let torsoWidth = floor(shouldDistance*1.9);
  let torsoHeight =  floor(shoulderHipDistance*1.25);
  let torsoPoseGrabbing = createVector(pose.leftShoulder.x*0.83,pose.leftShoulder.y*0.85);
  if (torsoWidth>0 && torsoHeight>0) {
    currentPoseToGrag  = new  PoseToGrb (torsoPoseGrabbing.x,torsoPoseGrabbing.y,torsoWidth,torsoHeight);
    fullBodyPosesToGrab.push(currentPoseToGrag);
  }
}
if (pose.leftHip.confidence > confidenceThreshold && pose.leftKnee.confidence > confidenceThreshold) {
  let thighWidth = floor(torsoWidth/2);
  let leftThighHeight = floor(dist(pose.leftHip.x,pose.leftHip.y,pose.leftKnee.x,pose.leftKnee.y)*1.2);
  let leftThighPoseGrabbing = createVector(pose.leftHip.x*0.825,pose.leftHip.y);
  if (thighWidth>0 && leftThighHeight>0) {
    currentPoseToGrag  = new  PoseToGrb (leftThighPoseGrabbing.x,leftThighPoseGrabbing.y,thighWidth,leftThighHeight);
    fullBodyPosesToGrab.push(currentPoseToGrag);
  }
}
if (pose.rightHip.confidence>confidenceThreshold && pose.rightHip.confidence > confidenceThreshold) {
  let thighWidth = floor(torsoWidth/2);
  let rightThighHeight = floor(dist(pose.rightHip.x,pose.rightHip.y,pose.rightKnee.x,pose.rightKnee.y)*1.2);
  let rightThighPoseGrabbing = createVector(pose.rightHip.x*0.825,pose.rightHip.y);
  if (thighWidth>0 && rightThighHeight>0) {
    currentPoseToGrag  = new  PoseToGrb (rightThighPoseGrabbing.x,rightThighPoseGrabbing.y,thighWidth,rightThighHeight);
    fullBodyPosesToGrab.push(currentPoseToGrag);
  }
}
if (pose.leftKnee.confidence>confidenceThreshold&& pose.leftAnkle.confidence > confidenceThreshold)  {
  let leftCalfWidth = torsoWidth ? max(floor(torsoWidth/3),floor(pose.leftKnee.x,pose.leftAnkle.x)) : floor(pose.leftKnee.x,pose.leftAnkle.x);
  let leftCalfHeight = floor (dist(pose.leftKnee.x,pose.leftKnee.y,pose.leftAnkle.x,pose.leftAnkle.y));
  let leftCalfGrabbingPose = createVector(pose.leftKnee.x*0.825,pose.leftKnee.y);
  if (leftCalfWidth > 0 && leftCalfHeight>0) {
    currentPoseToGrag  = new  PoseToGrb (leftCalfGrabbingPose.x,leftCalfGrabbingPose.y,leftCalfWidth,leftCalfHeight);
    fullBodyPosesToGrab.push(currentPoseToGrag);
  }
}
if (pose.rightKnee.confidence>confidenceThreshold && pose.rightAnkle.confidence > confidenceThreshold) {
  let rightCalfWidth = torsoWidth ? max(floor(torsoWidth/3),floor(pose.rightKnee.x,pose.rightAnkle.x)): floor(pose.rightKnee.x,pose.rightAnkle.x);
  let rightCalfHeight = floor (dist(pose.rightKnee.x,pose.rightKnee.y,pose.rightAnkle.x,pose.rightAnkle.y));
  let rightCalfGrabbingPose = createVector(pose.rightKnee.x*0.825,pose.rightKnee.y);
  if (rightCalfWidth > 0 && rightCalfHeight>0) {
    currentPoseToGrag  = new  PoseToGrb (rightCalfGrabbingPose.x,rightCalfGrabbingPose.y,rightCalfWidth,rightCalfHeight);
    fullBodyPosesToGrab.push(currentPoseToGrag);
  }}

  if (pose.leftShoulder.confidence  >  confidenceThreshold&& pose.leftElbow.confidence > confidenceThreshold) {

  let leftArmXDist = abs(pose.leftShoulder.x-pose.leftElbow.x);
  let leftArmYDist = abs(pose.leftShoulder.y-pose.leftElbow.y);
  let leftArmWidth = torsoWidth ? floor(max(leftArmXDist,torsoWidth/4)): floor(leftArmXDist);
  let leftArmHeight = torsoWidth ? floor(max(leftArmYDist,torsoWidth/4)): floor(leftArmYDist);
  let leftArmGrabbingPose = pose.leftElbow.x > pose.leftShoulder.x ? createVector(pose.leftShoulder.x*0.8,pose.leftShoulder.y*0.825) : createVector(pose.leftElbow.x*0.85,pose.leftElbow.y*0.85);
  if (leftArmWidth > 0 && leftArmHeight >0) {
    currentPoseToGrag  = new  PoseToGrb (leftArmGrabbingPose.x,leftArmGrabbingPose.y,leftArmWidth,leftArmHeight);
    fullBodyPosesToGrab.push(currentPoseToGrag);
  }
}

if (pose.rightShoulder.confidence > confidenceThreshold && pose.rightElbow.confidence >  confidenceThreshold) {
  let rightArmXDist = abs(pose.rightShoulder.x-pose.rightElbow.x);
  let rightArmYDist = abs(pose.rightShoulder.y-pose.rightElbow.y);
  let rightArmWidth = floor(max(rightArmXDist,torsoWidth/4));
  let rightArmHeight = floor(max(rightArmYDist,torsoWidth/4));
  let rightArmGrabbingPose = pose.rightElbow.x > pose.rightShoulder.x ? createVector(pose.rightShoulder.x,pose.rightShoulder.y*0.825) : createVector(pose.rightElbow.x,pose.rightElbow.y*0.825);
  if (rightArmWidth > 0 && rightArmHeight >0) {
    currentPoseToGrag  = new  PoseToGrb (rightArmGrabbingPose.x,rightArmGrabbingPose.y,rightArmWidth,rightArmHeight);
    fullBodyPosesToGrab.push(currentPoseToGrag);
  }
}

if (pose.leftWrist.confidence > confidenceThreshold && pose.leftElbow.confidence >confidenceThreshold) {

  let leftHandXDist = abs(pose.leftWrist.x-pose.leftElbow.x);
  let leftHandYDist = abs(pose.leftWrist.y-pose.leftElbow.y);
  let leftHandWidth = floor(max(leftHandXDist,torsoWidth/4)*2.5);
  let leftHandHeight = floor(max(leftHandYDist*1.5,torsoWidth/4)*1.5);
  let leftHandGrabbingPose = pose.leftElbow.x > pose.leftWrist.x ? createVector(pose.leftWrist.x*0.6,pose.leftWrist.y*0.85) : createVector(pose.leftElbow.x,pose.leftElbow.y*0.85);
  if (leftHandWidth > 0 && leftHandHeight >0) {
    currentPoseToGrag  = new  PoseToGrb (leftHandGrabbingPose.x,leftHandGrabbingPose.y,leftHandWidth,leftHandHeight);
    fullBodyPosesToGrab.push(currentPoseToGrag);
  }
}
if (pose.rightWrist.confidence>confidenceThreshold&& pose.rightElbow.confidence>confidenceThreshold) {

  let rightHandXDist = abs(pose.rightWrist.x-pose.rightElbow.x);
  let rightHandYDist = abs(pose.rightWrist.y-pose.rightElbow.y);
  let rightHandWidth = floor(max(rightHandXDist,torsoWidth/4)*2.5);
  let rightHandHeight = floor(max(rightHandYDist*1.5,torsoWidth/4)*1.5);
  let rightHandGrabbingPose = pose.rightElbow.x > pose.rightWrist.x ? createVector(pose.rightWrist.x*0.6,pose.rightWrist.y*0.85) : createVector(pose.rightElbow.x,pose.rightElbow.y*0.85);
  if (rightHandWidth > 0 && rightHandHeight >0) {
    currentPoseToGrag  = new  PoseToGrb (rightHandGrabbingPose.x,rightHandGrabbingPose.y,rightHandWidth,rightHandHeight);
    fullBodyPosesToGrab.push(currentPoseToGrag);
  }
}
  fullBodyPosesToGrab.sort((a,b)=> a.xGrab-b.xGrab === 0 ? a.yGrab - b.yGrab  : a.xGrab  - b.xGrab);
  // console.log(fullBodyPosesToGrab);
  fullBodyPosesToGrab.forEach(thisPose=>{
    // console.log(thisPose)s;
  // maskGraphics.ellipse (thisPose.xGrab+thisPose.width/2,thisPose.yGrab+thisPose.height/2,thisPose.width*random(0.99,1),thisPose.height*random(0.99,1));
  fullBodyGraphicsMasked.strokeWeight(random(2,5));
  fullBodyGraphicsMasked.noFill();
  fullBodyGraphicsMasked.rectMode(CENTER);
  let currentImage  = createImage(thisPose.width,thisPose.height);
  currentImage =  vidGraphics.get(thisPose.xGrab,thisPose.yGrab,thisPose.width,thisPose.height);
  fullBodyGraphics.image(currentImage,thisPose.xGrab,thisPose.yGrab);
  });

  let fullBodyImage = createImage(fullBodyGraphics.width,fullBodyGraphics.height);
  fullBodyGraphics.tint(255,jumpAlphaFade);
  fullBodyImage  = fullBodyGraphics.get();
  fullBodyGraphicsMasked.image(fullBodyImage,0,0);
  if (!isJumpCursor) {
  image(fullBodyGraphicsMasked,0,0,fullBodyGraphics.width*jumpScale*viewingScale,fullBodyGraphics.height*jumpScale*viewingScale);
} else {
  imageMode(CENTER);
  if (isJumpPlaceHolder) {
    image(fullBodyGraphicsMasked,fullBodyVecHolder.x,fullBodyVecHolder.y,fullBodyGraphics.width*jumpScale*viewingScale,fullBodyGraphics.height*jumpScale*viewingScale);
  } else  {
  image(fullBodyGraphicsMasked,mouseX,mouseY,fullBodyGraphics.width*jumpScale*viewingScale,fullBodyGraphics.height*jumpScale*viewingScale);
}
  imageMode(CORNER);
}
fullBodyPosesToGrab.length = 0;
maskGraphics.clear();
}

const toggleStates = () => {
  const interval = randomToggleInterval();
  displayStates.sort(()=>0.5 - Math.random);
  displayStates.forEach (state=> {
    state.bool = Boolean(Math.random() < 0.5);
    state.poses.length = 0;
    if (state.name === "TextAnimation" && state.bool){
      randomPoses(state.poses,1,3);
      textChosenPoses = state.poses;
      textThreshold = Math.random() * 0.35;
      fullText = possibleText[Math.floor(Math.random()*possibleText.length)];
      console.log(fullText);
      isChaningStringText = true;
    } 
    else if (state.name === "JumpAnimation" && state.bool)  {
      randomPoses(state.poses,3,7);
      jumpChosenPoses = state.poses;
      changeSlider(jumpScale, jumpScale,Math.random()*4.0, interval);
      setTimeout (()=> isClearJumpGraphics = Boolean(Math.random() < 0.5), randomToggleInterval());
      setTimeout (()=> changeSlider(jumpAlphaFade,jumpAlphaFade,Math.floor(Math.random()*256),150) , randomToggleInterval()/2);
      
    } 
    else if (state.name === "BodyAbstraction" && state.bool) {
      randomPoses(state.poses,2,4);
      abstractionChosenPoses  = state.poses;
     }
     console.log(state);
  });
  console.log(displayStates.findIndex(state=> state.bool === true));
  if (displayStates.findIndex(state=> state.bool === true) === -1) {
    console.log('all false! trying again!');
    toggleStates();
  } else {
  setTimeout(()=>toggleStates(),interval);
}
}

const randomPoses = (posesArray, min, max) => {
  const posesLimit = Math.random() * max  - Math.random() * min;
  possiblePoses.sort(()=>Math.random()-0.5);
  possiblePoses.forEach(pose=> {
  (Boolean(Math.random()<0.5) & posesArray.length < posesLimit) && posesArray.push(pose);
  })
  posesArray.length === 0 && randomPoses(posesArray,min, max);
}

const changeSlider = (slider,startVal, endVal, toggleInterval) => {
  // const currentVal = slider.value;
  const changeDirection = endVal - startVal;
  const sliderInerval = toggleInterval / (endVal - startVal);
  let valInterval = (endVal - startVal) / 20;
  // (endVal - startVal) / toggleInterval;;
  // if (changeDirection < 0) {
  //   valInterval *= -1;
  // } 
  slider += valInterval;
  if ((changeDirection > 0 && endVal > slider) || (changeDirection < 0 && endVal < slider)) {
    // console.log(slider, startVal, endVal);
    // console.log(changeDirection);
    setTimeout (()=>changeSlider(slider, startVal, endVal, toggleInterval), sliderInerval);
  }
}

const randomToggleInterval = () => {
  const minInterval = 1.5*microMinute;
  const maxInterval = 3*microMinute;
  return (Math.random()*maxInterval - Math.random()*minInterval);
}

function draw() {
  background(0);
  if (vidGraphics) {
  vidGraphics.push();
  vidGraphics.translate(vidGraphics.width,0);
  vidGraphics.scale(-1,1);
  vidGraphics.image(video,0,0);
  vidGraphics.pop();
}
  // if (isOriginalVideo) {
  //   if (vidGraphics) {
  //   image(vidGraphics,0,0,vidGraphics.width*viewingScale,vidGraphics.height*viewingScale);
  // }
  // }
   
  if (retrievedPoses)  {
    isFoundJumpPose = false;
    displayStates.sort(()=>0.5 - Math.random);
    displayStates.forEach(state=> {
      if (state.bool === true) {
      switch (state.name) {
        case 'TextAnimation':
          retrievedPoses.forEach((poses, index) => index < 5 && fullText && textAnimation(poses.pose.keypoints));
        break;
        case 'JumpAnimation':
          retrievedPoses.forEach((poses)=> {
            if (poses.pose.score > 0.2){
              jumpAnimation(poses.pose,poses.pose.keypoints);
              isFoundJumpPose = true;
            } 
          });
        break;
        case 'BodyAbstraction':
          retrievedPoses.forEach(poses =>  {
            if (poses.pose.score > 0.25) {
              bodyAbstraction(poses.pose,poses.skeleton,poses.pose.keypoints)
            }
          });
        break;
        default:
        break;
      } 
    }
    })
    if (isFoundJumpPose ===  false) {
      if (isJumpPlaceHolder && isJumpAnimation && !isOriginalVideo) {
        imageMode(CENTER);
        image(fullBodyGraphicsMasked,fullBodyVecHolder.x,fullBodyVecHolder.y,fullBodyGraphics.width*jumpScale*viewingScale,fullBodyGraphics.height*jumpScale*viewingScale);
        imageMode(CORNER);
      }
    }
  } 
  if (vidGraphics){
  vidGraphics.clear();
}
}

function mousePressed(){
  clickCounter++;
}

const keyPressed =(e)=> {
  if (e.keyCode === 13) {
    console.log(e);
    if (textAreaAnimation.value != "") {
      console.log(textAreaAnimation.value);
      // fullText = textAreaAnimation.value;
      textAreaAnimation.value = "";
      textAreaAnimation.placeholder = fullText;
      e.preventDefault();
    }
    if (jumpOrganListForm.value != "") {
      poseInputHandler(jumpChosenPoses,jumpOrganListForm.value,"jumpAddons");
      jumpOrganListForm.value = "";
  }
  if (textOrganListInput.value != "") {
    poseInputHandler(textChosenPoses,textOrganListInput.value,"textAddons");
    textOrganListInput.value = "";
}
if (abstractionOrganListInput.value != "" ) {
  poseInputHandler(abstractionChosenPoses,abstractionOrganListInput.value,"absractAddons");
  abstractionOrganListInput.value = "";
}
}



function poseInputHandler (poses,val,parentId) {
  console.log("new input handler for " + parentId);
  let isExist = false;
      poses.map(currentPose => {
        if (currentPose ==val) {
          isExist = true;
        } 
      });
      if(!isExist) {
      poses.push(val);
      let currentPoseP = document.createElement("P");
      currentPoseP.innerText = val;
      currentPoseP.id = val;
      currentPoseP.style.display = "inherit";
      // currentPoseP.left = 0;
      // currentPoseP.style.left = 0;
      // currentPoseP.style.marginLeft = 0;
      let deleteButton = document.createElement("BUTTON");
      deleteButton.innerText = "delete pose";
      deleteButton.id = val + 'Btn';
      deleteButton.style.display = 'inline';
      deleteButton.style.marginLeft = "2em";
      document.getElementById(parentId).appendChild(currentPoseP);
      currentPoseP.appendChild(deleteButton);
      deleteButton.addEventListener("click",e=>deleteButtonHandler (e,poses));
      // console.log(jumpChosenPoses);
    }
    }
}

const  deleteButtonHandler = (e,poses)=> {
  console.log(e);
  btn = document.getElementById(e.srcElement.id);
  currentPose = document.getElementById(e.srcElement.parentElement.id);
  poses.splice(poses.indexOf(currentPose),1);
  currentPose.remove();
  btn.remove();
  if (e.srcElement.id  ===  "fullBody"){
    fullBodyGraphics.clear();
    console.log('clearing fullBody!');
  } 
}
function animatingText (xPos,yPos,startTime) {
  if (!isAnimating) {
    isAnimating =!isAnimating
  }
  let runTime = millis()-startTime;
  textGraphics.stroke(23);
  textGraphics.strokeWeight(random(1,3));
  textGraphics.fill(random(220,255),random(200,255),10);
  textGraphics.textSize(20);
  textGraphics.text(currentText,xPos,yPos);
  
  // textGraphics.pop();
  
  if (runTime < 1500 && xPos < width*2) {
  setTimeout(()=>animatingText(xPos+random(width*0.1,width*0.15),yPos+random(-25,25),startTime),100);
} else {
  isAnimating =!isAnimating;
}
}

function autocomplete(inp, arr) {
  /*the autocomplete function takes two arguments,
  the text field element and an array of possible autocompleted values:*/
  var currentFocus;
  /*execute a function when someone writes in the text field:*/
  inp.addEventListener("input", function(e) {
      var a, b, i, val = this.value;
      /*close any already open lists of autocompleted values*/
      closeAllLists();
      if (!val) { return false;}
      currentFocus = -1;
      /*create a DIV element that will contain the items (values):*/
      a = document.createElement("DIV");
      a.setAttribute("id", this.id + "autocomplete-list");
      a.setAttribute("class", "autocomplete-items");
      /*append the DIV element as a child of the autocomplete container:*/
      this.parentNode.appendChild(a);
      /*for each item in the array...*/
      for (i = 0; i < arr.length; i++) {
        /*check if the item starts with the same letters as the text field value:*/
        if (arr[i].substr(0, val.length).toUpperCase() == val.toUpperCase()) {
          /*create a DIV element for each matching element:*/
          b = document.createElement("DIV");
          /*make the matching letters bold:*/
          b.innerHTML = "<strong>" + arr[i].substr(0, val.length) + "</strong>";
          b.innerHTML += arr[i].substr(val.length);
          /*insert a input field that will hold the current array item's value:*/
          b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
          /*execute a function when someone clicks on the item value (DIV element):*/
              b.addEventListener("click", function(e) {
              /*insert the value for the autocomplete text field:*/
              inp.value = this.getElementsByTagName("input")[0].value;
              /*close the list of autocompleted values,
              (or any other open lists of autocompleted values:*/
              closeAllLists();
          });
          a.appendChild(b);
        }
      }
  });
  /*execute a function presses a key on the keyboard:*/
  inp.addEventListener("keydown", function(e) {
      var x = document.getElementById(this.id + "autocomplete-list");
      if (x) x = x.getElementsByTagName("div");
      if (e.keyCode == 40) {
        /*If the arrow DOWN key is pressed,
        increase the currentFocus variable:*/
        currentFocus++;
        /*and and make the current item more visible:*/
        addActive(x);
      } else if (e.keyCode == 38) { //up
        /*If the arrow UP key is pressed,
        decrease the currentFocus variable:*/
        currentFocus--;
        /*and and make the current item more visible:*/
        addActive(x);
      } else if (e.keyCode == 13) {
        /*If the ENTER key is pressed, prevent the form from being submitted,*/
        e.preventDefault();
        if (currentFocus > -1) {
          /*and simulate a click on the "active" item:*/
          if (x) x[currentFocus].click();
        }
      }
  });
  function addActive(x) {
    /*a function to classify an item as "active":*/
    if (!x) return false;
    /*start by removing the "active" class on all items:*/
    removeActive(x);
    if (currentFocus >= x.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = (x.length - 1);
    /*add class "autocomplete-active":*/
    x[currentFocus].classList.add("autocomplete-active");
  }
  function removeActive(x) {
    /*a function to remove the "active" class from all autocomplete items:*/
    for (var i = 0; i < x.length; i++) {
      x[i].classList.remove("autocomplete-active");
    }
  }
  function closeAllLists(elmnt) {
    /*close all autocomplete lists in the document,
    except the one passed as an argument:*/
    var x = document.getElementsByClassName("autocomplete-items");
    for (var i = 0; i < x.length; i++) {
      if (elmnt != x[i] && elmnt != inp) {
      x[i].parentNode.removeChild(x[i]);
    }
  }
}
/*execute a function when someone clicks in the document:*/
document.addEventListener("click", function (e) {
    closeAllLists(e.target);
});
}

class PoseToGrb {
  constructor (x_grab, y_grab,grabWidth,grabHeight) {
    this.xGrab  = floor(x_grab);
    this.yGrab = floor(y_grab);
    this.width = floor(grabWidth);
    this.height = floor(grabHeight);
  }

}

