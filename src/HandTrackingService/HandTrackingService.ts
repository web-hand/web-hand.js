import type { coordinates, HandVector, IHandTrackingService, Settings } from './HandTrackingService.type';
import { Hands } from '@mediapipe/hands';
import { isDefined } from '../utils/isDefined';

export class HandTrackingService implements IHandTrackingService {
  private hands: Hands;
  private videoSourceObect: MediaStream | undefined;
  isRunning: boolean;
  private videoElement: HTMLVideoElement | undefined;
  private temp: HandVector;

  constructor(settings: Settings) {
    this.temp = [[{ x: 0, y: 0, z: 0 }]];
    const defaultHandsNumber = 1;
    const defaultMinTrackingConfidence = 0.5;
    const defaultMinDetectionConfidence = 0.5;
    const defaultModelComplexity = 1;

    this.isRunning = false;
    this.hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    this.hands.setOptions({
      maxNumHands: settings?.handsNumber ? settings?.handsNumber : defaultHandsNumber,
      minDetectionConfidence: settings?.minDetectionConfidence ? settings?.minDetectionConfidence : defaultMinDetectionConfidence,
      minTrackingConfidence: settings?.minTrackingConfidence ? settings?.minTrackingConfidence : defaultMinTrackingConfidence,
      modelComplexity: settings?.modelComplexity ? settings?.modelComplexity : defaultModelComplexity,
    });
    this.hands.onResults(this.onResults);

    this.videoSourceObect = settings?.videoSourceObect ? settings?.videoSourceObect : undefined;
  }

  async start(): Promise<void> {
    if (!this.isRunning) {
      this.videoElement = document.createElement('video');
      if (this.videoSourceObect) {
        this.videoElement.srcObject = this.videoSourceObect;
      } else {
        await this.getCamera().then((device) => {
          if (isDefined(this.videoElement)) {
            this.videoSourceObect = device;
            this.videoElement.srcObject = device;
          } else {
            throw new Error(`Cannot access video elemet`);
          }
        });
      }
      await this.videoElement.play().catch((e: string) => {
        throw new Error(`Cannot play media streem ${e}`);
      });
      document.body.appendChild(this.videoElement);
      this.isRunning = true;
    }
  }
  stop(): void {
    if (this.isRunning) {
      this.videoElement?.remove();
      this.isRunning = false;
    }
  }

  onResults(results: { multiHandLandmarks: coordinates[][] }): void {
    console.log(results.multiHandLandmarks);
    this.temp = results.multiHandLandmarks;
    console.log(this.temp);
  }

  async requestPrediction(): Promise<HandVector> {
    return new Promise((resolve) => {
      if (isDefined(this.videoElement)) {
        this.hands
          .send({ image: this.videoElement })
          .then(() => {
            resolve([[{ x: 0, y: 0, z: 0 }]]);
          })
          .catch((e) => {
            console.log(e);
          });
      }
    });
  }

  private getCamera(): Promise<MediaStream> {
    const constraints = { audio: false, video: { facingMode: 'environment' } };
    return new Promise((resolve) => {
      navigator.mediaDevices
        ?.getUserMedia(constraints)
        .then(resolve)
        .catch((error: string) => {
          throw new Error(`Cannot create camera: ${error}`);
        });
    });
  }
}
