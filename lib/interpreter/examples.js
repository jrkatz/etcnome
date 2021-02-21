// Etcnome - A programmable metronome
// Copyright (C) 2020  Jacob Katz
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

export default {
  basic: `bpm 120
4/4
3/4`,
  comments: `//everything after '//' is ignored:
bpm 120
// 3/4 // see?
4/4`,
  "compound time": `bpm 120
6/8`,
  "additive time": `bpm 120
3+2/4`,
  polyrhythms: `bpm 120
4:5/4
5:4/4
//polyrhythms work alongside additive time as well.
4:2+3/4`,
  "tempo control": `bpm 120
4/4
bpm 200
4/4
a tempo //a tempo return sus to the previous tempo
4/4
bpm * 1.5 //adjustments can be made in relative terms as well
4/4`,
  "advanced tempo control (acc, rit)": `bpm 120
acc 240 4 // accelerate to 240bpm over 4 beats
4/4
4/4 //keep playing at 4/4
rit 60 8 // slow to 60 bpm over 8 beats
4/4
4/4
a tempo
4/4
bpm 120
//tempo changes can be delayed as well:
acc 180 8 4 //reach 180bpm in 8 beats,
//don't start changing tempo for 4 beats
4/4
4/4
rit * 0.5 8 4 //tempo changes can be expressed in relative terms too
4/4
4/4
4/4`,
  repetition: `bpm 120
4/4 * 2
3/4 * 3
(
4/4
3/4
) * 2 `,
  reuse: `bpm 120
//any part can be given a name and reused
verse = 4/4
verse // plays the bridge of 4/4
bridge = 4/4 * 2
bridge //plays four bars of 4/4
verse * 2 // also plays four bars of 4/4
chorus = (
  4/4
  3/4
)
chorus
//reuse respects tempo and swing changes, for example:
bpm 300
swing 1.5
verse
swing off
bridge
rit 150 7
chorus
//to re-use a part exactly, use 'exactly':
exactly chorus //this will play back at 120 bpm
4/4 //this will still play at 300bpm.
//"exactly" is dangerous and you will regret
//using it.
`,
  swing: `bpm 120
swing 1.4
//for every pair of two beats, the first
//beat is alotted 1.4x its original share
//of the total duration, and the other is
//given the remaining time
4/4 * 2
//''swing off' or 'straight' disables swing
swing off
4/4

swing 1.4 1.3
//for every set of three beats, the first
//beat is alotted 1.4x its original share
//of the total duration, the next is
//alotted 1.3x its share of the remaining
//time, and the last is given whatever
//time remains
3/4 * 2
straight
3/4

swing 1.5 ... 4
//for every set of four beats, the first
//beat is alotted 1.4x its original share
//of the total duration, and the
//remaining time is alotted
//(proportionately) to the remaining
// threebeats
4/4 * 2

swing 0.8 1.5 ... 5
//for every set of five beats, the first
//beat is alotted .8x its original share
//of the total duration, the next 1.5x
//its share of the remaining duration,
//and whatever time is left is alotted
//(proportionately) to the remaining
//three beats
5/4 * 2`,
  "exact beats": `bpm 120
//sometimes you just want to write down
//exactly what you want to happen
beats hi 1 mid 0.5 lo * 1.5
//use the 'beats' instruction to specify
//a list of beats. The above plays a beat
//with a 'high' click 1 second long, then
//a beat with a 'mid' click .5 seconds
//long, then a beat with a 'lo' click
//that lasts 1.5 beats in the prevailing
//bpm
`,
};
