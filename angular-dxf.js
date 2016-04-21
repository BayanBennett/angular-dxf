angular.module('ngDxf', [])
        .service('ngDxf', function () {
            function toJson(dxf) {
                var json = {};
                dxf = dxf.split(/\s*\r\n/g).map(function (item) {
                    if (!isNaN(parseFloat(item)))
                        item = parseFloat(item);
                    return item;
                });
                function dxfObj(parent) {
                    this.data = {};
                    this.depth = parent ? parent.depth + 1 : 0;
                    this.parent = parent;
                    this.goToParent = function () {
                        this.parent.data[this.parent.key] = this.data;
                        return this.parent;
                    };
                }
                function getNextState(state, data) {                            //for reaading the codes
                    state.code = data;
                    state.read = false;
                    return state;
                }
                function processData(state, data, index) {
                    if (state.code === 0) {
                        if (data === "SECTION") {                               //initialize our new section
                            state.obj = new dxfObj();
                        } else if (data === "APPID") {
                            state.obj = state.obj.goToParent();
                        } else if (data === "ENDSEC") {                         //end section
                            while (state.obj.parent) {
                                state.obj = state.obj.goToParent();
                            }
                            angular.merge(json, state.obj.data);
                        } else if (data === "POLYLINE") {
                            if (!(state.obj.data instanceof Array)) {
                                state.obj.data = [];
                            }
                            state.obj.key = data;
                            state.obj = new dxfObj(state.obj); //push a new dxfObj to the stack then set the current object to that object.
                            state.obj.data.vertices = [];

                        } else if (data === "VERTEX") {
                            if (state.obj.depth > 2) {
                                state.obj.parent.data.vertices.push(state.obj.data);
                                state.obj = state.obj.parent;
                            }
                            state.obj = new dxfObj(state.obj);
                        } else if (data === "SEQEND") {                          //Push the polyline to the entity array.
                            if (state.obj.depth > 2) {
                                state.obj.parent.data.vertices.push(state.obj.data);
                                state.obj = state.obj.parent;
                            }
                            if (state.obj.depth > 1) {
                                var temp = {};
                                temp[state.obj.parent.key] = state.obj.data;
                                state.obj.parent.data.push(temp);
                                state.obj = state.obj.parent;
                            }
                        } else if (data === "EOF") {

                        }
                    } else if (state.code === 1) {
                        state.obj.data = data;
                    } else if (state.code === 2) {                              //block name
                        state.obj.key = data;                                   //sets the key that we want to modify
                        state.obj = new dxfObj(state.obj);                      //set the current object and saves a reference to the parent
                    } else if (state.code === 8) {                              //LAYER NAME
                        if (!(state.obj.data instanceof Array)) {
                            state.obj.data.name = data;
                        }
                    } else if (state.code === 9) {
                        if (state.obj.depth > 1) {
                            state.obj = state.obj.goToParent();
                        }
                        state.obj.key = data;
                        state.obj = new dxfObj(state.obj);
                    } else if (state.code === 10) {
                        state.obj.data.x = data;
                    } else if (state.code === 20) {
                        state.obj.data.y = data;
                    } else if (state.code === 30) {
                        state.obj.data.z = data;
                    } else if (state.code === 62) {                             //COLOR NUMBER
                        state.obj.data.color = data;
                    } else if (70 <= state.code && state.code <= 78) {          //Integer values, such as repeat counts, flags bits, or modes
                        state.obj.data.flag = data;
                    }
                    state.read = true;
                    return state;
                }
                dxf.reduce(function (state, data, index) {
                    if (state.read)
                        return getNextState(state, data);
                    return processData(state, data, index);
                }, {"read": true});
                return json;
            }

            return {
                'toJson': function (dxf) {
                    return toJson(dxf);
                }
            };
        })
        ;