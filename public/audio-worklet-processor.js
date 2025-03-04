/* eslint-disable @typescript-eslint/no-unused-vars */
class MyAudioWorkletProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];

        if (input && output) {
            for (let channel = 0; channel < output.length; ++channel) {
                const inputChannel = input[channel];
                const outputChannel = output[channel];
                if (!inputChannel) return false;
                for (let i = 0; i < inputChannel.length; ++i) {
                    outputChannel[i] = inputChannel[i]; // Passthrough 音訊數據
                }
            }

            // 轉換 Float32Array to Int16Array (仍然需要轉換格式)
            const int16Array = this.convertFloat32ToInt16(input[0]); // 假設處理第一個輸入通道

            // 將音訊資料發送到主執行緒 (只傳輸音訊數據, 不包含音量資訊)
            this.port.postMessage({
                audioData: false ? new Int16Array(4096).buffer : int16Array.buffer, //  靜音處理假設在主執行緒控制
            });
        }
        return true;
    }
    /**轉換結構 (保留轉換函式)**/
    convertFloat32ToInt16(buffer) {
        const int16Array = new Int16Array(buffer.length);
        for (let i = 0; i < buffer.length; i++) {
            int16Array[i] = buffer[i] * 32767;
        }
        return int16Array;
    }
}

registerProcessor('my-audio-processor', MyAudioWorkletProcessor);