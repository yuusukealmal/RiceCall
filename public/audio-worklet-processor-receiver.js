/* eslint-disable @typescript-eslint/no-unused-vars */
class MyReceiveAudioWorkletProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.port.onmessage = (event) => {
            if (event.data && event.data.audioData) {
                // 接收主執行緒傳來的 Int16Array 音訊數據
                this.int16AudioData = new Int16Array(event.data.audioData);
            }
        };
        this.int16AudioData = new Int16Array(0); // 初始化空的 Int16Array
        this.dataIndex = 0; // 用於追蹤目前處理的數據索引
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0];
        const outputChannel = output[0]; // 假設是單聲道

        if (outputChannel) {
            for (let i = 0; i < outputChannel.length; ++i) {
                if (this.dataIndex < this.int16AudioData.length) {
                    // 將 Int16 數據正規化為 Float32 並寫入輸出
                    outputChannel[i] = this.int16AudioData[this.dataIndex] / 32767;
                    this.dataIndex++;
                } else {
                    // 如果 Int16 數據已處理完畢，輸出靜音 (0)
                    outputChannel[i] = 0;
                }
            }

            if (this.dataIndex >= this.int16AudioData.length) {
                this.int16AudioData = new Int16Array(0); // 處理完畢後清空數據
                this.dataIndex = 0; // 重置索引
            }
            return true; // 保持 worklet 運作
        }
        return false;
    }
}

registerProcessor('my-receive-audio-processor', MyReceiveAudioWorkletProcessor);