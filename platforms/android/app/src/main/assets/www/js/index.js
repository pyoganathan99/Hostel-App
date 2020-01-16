/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var app = {
    // Application Constructor
    initialize: function () {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function () {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function () {
        app.receivedEvent('deviceready');
    },
    // Update DOM on a Received Event
    receivedEvent: function (id) {

        let studentData, date;

        let csvInput = document.getElementById('csv-input');
        let currentStatus = document.getElementById('current-status');
        let datePicker = document.getElementById('date-picker');
        let dateDisplay = document.getElementById('date-display');
        let generatePdf = document.getElementById('generate-pdf');

        let cacheRaw = localStorage.getItem('student-data');
        if (!cacheRaw) {
            currentStatus.innerHTML = 'Data not available. Select file.'
        } else {
            studentData = JSON.parse(cacheRaw);
            currentStatus.innerHTML = 'Data available.'
        }

        csvInput.addEventListener('change', () => {
            currentStatus.innerHTML = 'Loading data.'
            let file = csvInput.files[0];
            fileReader = new FileReader();
            fileReader.readAsText(file);
            fileReader.onload = (e) => {
                try {
                    let raw = e.target.result;
                    let rows = raw.split('\r\n');
                    rows = rows.map(e => e.split(','));
                    rows.shift();
                    let data = rows.map(e => {
                        return {
                            name: e[0],
                            room: e[1],
                            department: e[2],
                            phone: e[3],
                        }
                    });
                    studentData = data;
                    localStorage.setItem('student-data', JSON.stringify(studentData));

                    currentStatus.innerHTML = 'Data loaded successfully.'
                } catch {
                    currentStatus.innerHTML = 'Unable to load data';
                }
            }
        })

        datePicker.addEventListener('click', () => {
            let options = {
                type: 'date',
                date: date || new Date(),
                maxDate: new Date(),
            };

            window.DateTimePicker.pick(options, function (timestamp) {
                date = new Date(timestamp);
                date.setHours(0, 0, 0, 0);
                dateDisplay.innerHTML =
                    date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();
            });
        })

        generatePdf.addEventListener('click', () => {
            smsreader.getAllSMS(date)
                .then((sms) => {

                    let aggregate = {}

                    sms.forEach(({ address: number, body: message, date }) => {

                        let sanitize = number => number.replace(/(\+91)|(\()|(\))|\s/g, '');

                        let student = studentData.find(e =>
                            sanitize(number) == sanitize(e.phone)
                        );

                        if (student) {
                            let { department, room, name } = student;
                            aggregate[department] = aggregate[department] || [];
                            aggregate[department].push({
                                name,
                                room,
                                message,
                                date,
                            });
                        }
                    });

                    aggregate = Object.entries(aggregate);

                    aggregate.forEach(department => {
                        department[1] = department[1].sort((a, b) => a.name.localeCompare(b.name));
                    })

                    let messageBuilder = ({ name, room, message, date }) => `
                        <tr>
                            <td>${name}</td>
                            <td>${room}</td>
                            <td>${date}</td>
                            <td>${message}</td>
                        </tr>          
                    `

                    let departmentBuilder = ([department, messages]) => `
                        <h3>${department}</h3><br>
                        <table border="1">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Room</th>
                                    <th>Date</th>
                                    <th>Message</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${messages.map(messageBuilder).join('')}
                            </tbody>
                        </table><br><br>
                    `

                    let finalString = aggregate.map(departmentBuilder).join('');

                    let options = {
                        documentSize: 'A4',
                        type: 'share',
                        fileName: 'Hostel Parent SMS ' + new Date(),
                    }

                    pdf.fromData(finalString, options);
                },
                    (err) => {
                        alert('Unable to read SMS');
                    }
                );
        })

    }
};
