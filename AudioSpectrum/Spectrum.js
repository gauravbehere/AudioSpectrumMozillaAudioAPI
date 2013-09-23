/**
 * @author Gaurav Behere
 * Spectrum Visualizer
 * Public APIs: init, getSpectrum
 */
Spectrum = function() {
	var spectrumArr =[];
	var audio_elem; // input audio
	var channels;
	var sample_rate;
	var frame_buffer_size;
	var source_buffer;
	var source_song_pointer = 0;
	var target_buffers = [];
	var overlap_buffer;
	var target_buffer_pointer = 0;
	var spectrum_buffer;
	var fft_re = [];
	var fft_im = [];
	var fft;
    var spectrumDataTimer = null;


    /**
     * API to be called by UI presentation
     * returns instant's spectrum data
     * @returns {Array}
     */
	function getSpectrum(){
	return spectrumArr;
	}


    /**
     * API bound to MozAudioAvailable
     * Calculates spectrum amplitude array based on FFT of the instant frame buffer
     * @param event
     */
	function audioAvailable(event) {
        //console.log(event.frameBuffer);
		source_buffer.set(event.frameBuffer, source_song_pointer);
		var half_frame_buffer_size = frame_buffer_size / 2;
		var offset = [];
		offset[0] = source_song_pointer - half_frame_buffer_size;
		offset[1] = offset[0] + half_frame_buffer_size;
		offset[2] = offset[1] + half_frame_buffer_size;
		if (offset[0] < 0)
			offset[0] += source_buffer.length;

		source_song_pointer += frame_buffer_size;
		source_song_pointer %= frame_buffer_size * 2;

		for (var i = 0; i < 2; i++) {
			target_buffers[i].set(source_buffer.subarray(offset[i + 0], offset[i + 0] + half_frame_buffer_size), 0);
			target_buffers[i].set(source_buffer.subarray(offset[i + 1], offset[i + 1] + half_frame_buffer_size), half_frame_buffer_size);

			for (var j = 0; j < channels; j++) {
				fft.forward(target_buffers[i], channels, j, fft_re[j], fft_im[j]);
				for (var k = 1; k < fft.size / 2; k++) {
					var f = (k - 1)* 20 / (fft.size - 1);
					fft_re[j][k] *= f;
					fft_im[j][k] *= f;
					fft_re[j][fft.size - k] *= f;
					fft_im[j][fft.size - k] *= f;
				}
			}
			for (var j = 0; j < channels; j++) {
				fft.inverse(fft_re[j], fft_im[j], target_buffers[i], channels, j);
			}
		}
		var spectrum_pointer = target_buffer_pointer;
		for (var i = 0; i < 2; i++) {
			for (var j = 0; j < frame_buffer_size / 2; j++) {
				overlap_buffer[target_buffer_pointer + j] += target_buffers[i][j];
			}
			target_buffer_pointer += frame_buffer_size / 2;
			target_buffer_pointer %= overlap_buffer.length;
			for (var j = 0; j < frame_buffer_size / 2; j++) {
				overlap_buffer[target_buffer_pointer + j] = target_buffers[i][frame_buffer_size / 2 + j];
			}
		}
		spectrum_buffer = overlap_buffer.subarray(spectrum_pointer, spectrum_pointer + frame_buffer_size);
	}


    /**
     * API to keep filling spectrum data array
     */
	function getSpectrumData() {
		if (!spectrum_buffer) {
			return;
		}
		// FFT to completion buffer for spectrum drawing
		for (var i = 0; i < channels; i++) {
			fft.forward(spectrum_buffer, channels, i, fft_re[i], fft_im[i]);
		}
		var scale = 100;
		for (var i = 0; i < fft.size / 2; i += 4) {
			var spectrum = 0;
			for (var j = 0; j < channels; j++) {
				var re = fft_re[j];
				var im = fft_im[j];
				for (var k = 0; k < 4; k++) {
					spectrum += Math.sqrt(re[i + k] * re[i + k] + im[i + k] * im[i + k]);
				}
				spectrum /= 4;
			}
			spectrum /= channels;
			spectrum *= scale;
			magnitude = spectrum * 256;

            // Normalizing the spectrum data
			if(magnitude != null && magnitude!= undefined && magnitude!="")
			spectrumArr[i/4] = magnitude ;
			else
			spectrumArr[i/4] = 0;
		}
	}


    /**
     * API bound to loadedmetadata event
     * initializes initial frame buffer size, channels, sample rate
     * @param event
     */
	function loadedMetadata(event) {
		audio_elem.addEventListener('MozAudioAvailable', audioAvailable, false);
		frame_buffer_size = audio_elem.mozFrameBufferLength;
		channels = audio_elem.mozChannels;
		sample_rate = audio_elem.mozSampleRate;
		source_buffer = new Float32Array(frame_buffer_size * 2);
		source_song_pointer = 0;
		target_buffers[0] = new Float32Array(frame_buffer_size);
		target_buffers[1] = new Float32Array(frame_buffer_size);
		overlap_buffer = new Float32Array(frame_buffer_size * 2);
		target_buffer_pointer = 0;
		var bufferSize = frame_buffer_size / channels;
		fft = new FFT(bufferSize);

		for (var i = 0; i < channels; i++) {
			fft_re[i] = new Float32Array(bufferSize);
			fft_im[i] = new Float32Array(bufferSize);
		}
        spectrumDataTimer = setInterval(getSpectrumData, 1000 / 24);
	}


    /**
     * Initialization of Spectrum
     * Binds loadedmetadata on audio element
     */
	function init() {
		audio_elem = document.getElementById("audio");
		audio_elem.addEventListener('loadedmetadata', loadedMetadata, false);
	}

	return { init: init, getSpectrum:getSpectrum };
}();