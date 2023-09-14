import { spawn } from 'child_process';

/**
 * @param {string} text
 */
function sanitize(text) {
    let output = "";
    for (const char of text) {
        if (char == '\'') {
            output += `'\\\\\\''`;
        } else if (char == '\\') {
            output += `\\\\`;
        } else if (char == ':') {
            output += `'\\\\:'`;
        } else output += char;
    }
    return output;
}

/**
 * @param {string} text
 * @param {number} font_size
 * @param {number} max_width
 * @return {[string, number]} [output text, halfpoint]
 */
function break_text(text, font_size, max_width) {
    let character_size = font_size * 0.57;
    let space_size = font_size * 0.1875;
    
    let output = "";

    let halfpoint = -1;
    let numlines = 0;

    let width = 0;
    let last_line = 0;
    let last_space = 0;
    for (let i = 0; i < text.length; i++) {
        let ch = text[i];
        if (ch == ' ') {
            last_space = i;
            width += space_size;
        } else if (ch == '\n' || ch == '|') {
            last_space = i;
        } else {
            width += character_size;
        }

        if (width > max_width || ch == '\n' || ch == '|') {
            if (ch == '|') halfpoint = numlines;

            let end = last_line != last_space ? last_space : i; // break inside long words
            output += text.substring(last_line, end);
            output += '\n';

            width = 0;
            i = end + 1;
            last_line = i;
            last_space = i;
            numlines += 1;
        }
    }
    output += text.substring(last_line, text.length);

    if (halfpoint == -1) halfpoint = Math.floor((numlines-1)/2);

    return [output, halfpoint];
}

/**
 * @param {string} text Input text
 * @param {string} emotion Path to input gif
 * @param {number} fontsize Font size
 * @param {number} outputsize Square size of output gif
 * @returns {Promise<string>} The output file
 */
export let create_gif = (text, emotion, fontsize, outputsize) => new Promise((resolve, reject) => {
    let output = break_text(text, fontsize, outputsize)
    text = output[0];
    let halfpoint = output[1];
    text = sanitize(text);

	let border_width = Math.ceil(fontsize/20);

    let split = text.split('\n');
    let drawtexts = split.map((s, i) => {
        let vertical_pos;
        if (i <= halfpoint){
            vertical_pos = `${i*fontsize}`;
        } else {
            vertical_pos = `h-${(split.length-i)*fontsize}`;//(text_h*${(split.length-i)*1.1})`;
        }

        return `drawtext=fontfile=font.otf: text='${s}': x=(w-text_w)/2:y=${vertical_pos}: fontsize=${fontsize}: fontcolor=white: bordercolor=black: borderw=${border_width}`;
    }).join(", ");

    let outputpath = 'output.gif';

    let log = "";
    let ffmpeg = spawn(
        'ffmpeg', [
            '-y',
            '-i',
            emotion, 
            '-vf',
            `scale=${outputsize}:${outputsize}, ${drawtexts}`, 
            outputpath,
        ]
    );

    ffmpeg.stderr.on('data', data => log += data);
    ffmpeg.on('close', () => {
        console.log(log);
        resolve(outputpath);
    });
    ffmpeg.on('error', e => reject(e));
});
