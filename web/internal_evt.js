/* Copyright 2026 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// The published display layer uses this token for internal editor listeners.
const INTERNAL_EVT = "0a475cb6-573c-46ed-869d-fa7c5839d995";

const internalOpt = Object.freeze({ internal: INTERNAL_EVT });

export { INTERNAL_EVT, internalOpt };
