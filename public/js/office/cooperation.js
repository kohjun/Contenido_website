// 전역 변수들을 window 객체에 할당하여 스코프 문제 해결
window.CooperationMap = {
    map: null,
    routeMap: null,
    markers: [],
    places: null,
    routeMarkers: [],
    routePolyline: null,
    isMapInitialized: false,
    currentInfoWindow: null,

    initialize() {
        const loadingElement = document.getElementById('map-loading');
        if (loadingElement) {
            loadingElement.style.display = 'block';
        }

        try {
            const container = document.getElementById('map');
            const routeContainer = document.getElementById('route-map');
            
            if (!container || !routeContainer) {
                throw new Error('Map containers not found');
            }

            const options = {
                center: new kakao.maps.LatLng(37.566826, 126.978656),
                level: 3
            };

            this.map = new kakao.maps.Map(container, options);
            this.routeMap = new kakao.maps.Map(routeContainer, options);
            this.places = new kakao.maps.services.Places();

            const zoomControl = new kakao.maps.ZoomControl();
            this.map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);
            this.routeMap.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);

            this.isMapInitialized = true;
            this.setupEventListeners();
            this.loadSavedPlaces();

            if (loadingElement) {
                loadingElement.style.display = 'none';
            }

            console.log('Map initialization complete');
        } catch (error) {
            console.error('Error initializing map:', error);
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            this.showError('지도 초기화 중 오류가 발생했습니다: ' + error.message);
        }
    },

    setupEventListeners() {
        // 탭 전환 이벤트
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => window.switchTab(tab.dataset.tab));
        });

        // 검색 입력 이벤트
        const keywordInput = document.getElementById('keyword');
        if (keywordInput) {
            keywordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    window.searchPlaces();
                }
            });
        }

        // 검색 버튼 이벤트
        const searchButton = document.querySelector('.search-button');
        if (searchButton) {
            searchButton.addEventListener('click', () => window.searchPlaces());
        }
    },

    // 장소 검색
    searchPlaces() {
        if (!this.isMapInitialized) {
            this.showError('지도가 아직 초기화되지 않았습니다.');
            return;
        }

        const keyword = document.getElementById('keyword').value;
        if (!keyword.replace(/^\s+|\s+$/g, '')) {
            this.showError('검색어를 입력해주세요.');
            return;
        }

        this.places.keywordSearch(keyword, (data, status) => {
            if (status === kakao.maps.services.Status.OK) {
                this.displayPlaces(data);
            } else if (status === kakao.maps.services.Status.ZERO_RESULT) {
                this.showError('검색 결과가 존재하지 않습니다.');
            } else if (status === kakao.maps.services.Status.ERROR) {
                this.showError('검색 중 오류가 발생했습니다.');
            }
        });
    },

    // 검색 결과 표시
    displayPlaces(places) {
        const listEl = document.getElementById('places-list');
        const bounds = new kakao.maps.LatLngBounds();

        this.removeMarkers();
        listEl.innerHTML = '';

        places.forEach((place, index) => {
            const placePosition = new kakao.maps.LatLng(place.y, place.x);
            const marker = this.addMarker(placePosition);
            bounds.extend(placePosition);

            const itemEl = this.createPlaceItem(place);
            listEl.appendChild(itemEl);

            kakao.maps.event.addListener(marker, 'click', () => {
                this.displayPlaceInfo(place, marker);
            });
        });

        this.map.setBounds(bounds);
    },

    // 마커 관리
    addMarker(position) {
        const marker = new kakao.maps.Marker({
            position: position,
            clickable: true
        });
        marker.setMap(this.map);
        this.markers.push(marker);
        return marker;
    },

    removeMarkers() {
        this.markers.forEach(marker => marker.setMap(null));
        this.markers = [];
    },

    // 장소 아이템 UI 생성
    createPlaceItem(place) {
        const itemEl = document.createElement('div');
        itemEl.className = 'place-item';
        
        itemEl.innerHTML = `
            <div class="place-info">
                <div class="place-name">${place.place_name}</div>
                <div class="place-address">${place.address_name}</div>
                ${place.phone ? `<div class="place-phone">📞 ${place.phone}</div>` : ''}
                ${place.category_name ? `<div class="place-category">🏷️ ${place.category_name}</div>` : ''}
            </div>
            <div class="action-buttons">
                <button onclick="window.CooperationMap.savePlace(${JSON.stringify(place)})" class="action-button save-button">저장</button>
            </div>
        `;
        
        return itemEl;
    },

    // 장소 저장
    async savePlace(place) {
        try {
            const placeData = {
                placeId: place.id,
                placeName: place.place_name,
                addressName: place.address_name,
                roadAddressName: place.road_address_name,
                phoneNumber: place.phone,
                category: place.category_name,
                longitude: parseFloat(place.x),
                latitude: parseFloat(place.y)
            };

            const response = await fetch('/saved-places', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(placeData)
            });

            const result = await this.handleApiResponse(response);
            this.showSuccess(result.message || '장소가 저장되었습니다');
            await this.loadSavedPlaces();
        } catch (error) {
            console.error('Error saving place:', error);
            this.showError('장소 저장에 실패했습니다: ' + error.message);
        }
    },

    // 저장된 장소 불러오기
    async loadSavedPlaces() {
        try {
            const response = await fetch('/saved-places');
            const data = await this.handleApiResponse(response);

            if (!Array.isArray(data)) {
                throw new Error('올바르지 않은 데이터 형식입니다');
            }

            this.displaySavedPlaces(data);
        } catch (error) {
            console.error('Error loading saved places:', error);
            this.showError('저장된 장소를 불러오는데 실패했습니다: ' + error.message);
        }
    },

    // 저장된 장소 표시
    displaySavedPlaces(places) {
        const listEl = document.getElementById('saved-places-list');
        if (!listEl) return;

        listEl.innerHTML = '';

        if (places.length === 0) {
            listEl.innerHTML = '<p class="no-places">저장된 장소가 없습니다.</p>';
            return;
        }

        places.forEach(place => {
            const itemEl = document.createElement('div');
            itemEl.className = 'place-item';
            
            itemEl.innerHTML = `
                <div class="place-info">
                    <div class="place-name">${place.placeName || '이름 없음'}</div>
                    <div class="place-address">${place.addressName || '주소 없음'}</div>
                    ${place.phoneNumber ? `<div class="place-phone">📞 ${place.phoneNumber}</div>` : ''}
                    ${place.category ? `<div class="place-category">🏷️ ${place.category}</div>` : ''}
                </div>
                <div class="action-buttons">
                    <button onclick="window.CooperationMap.showOnMap('${place._id}')" class="action-button">지도에서 보기</button>
                    <button onclick="window.CooperationMap.deletePlace('${place._id}')" class="action-button delete-button">삭제</button>
                </div>
            `;

            listEl.appendChild(itemEl);
        });
    },

    // 장소 삭제
    async deletePlace(placeId) {
        if (!confirm('이 장소를 삭제하시겠습니까?')) {
            return;
        }

        try {
            const response = await fetch(`/saved-places/${placeId}`, {
                method: 'DELETE'
            });

            await this.handleApiResponse(response);
            this.showSuccess('장소가 삭제되었습니다');
            await this.loadSavedPlaces();
        } catch (error) {
            console.error('Error deleting place:', error);
            this.showError('장소 삭제에 실패했습니다: ' + error.message);
        }
    },

    // 지도에서 장소 보기
    async showOnMap(placeId) {
        try {
            const response = await fetch(`/saved-places/${placeId}`);
            const place = await this.handleApiResponse(response);

            if (!place.location?.coordinates) {
                throw new Error('잘못된 장소 데이터입니다');
            }

            const position = new kakao.maps.LatLng(
                place.location.coordinates[1],
                place.location.coordinates[0]
            );

            this.removeMarkers();

            const marker = this.addMarker(position);
            this.displayPlaceInfo({
                place_name: place.placeName,
                address_name: place.addressName,
                road_address_name: place.roadAddressName,
                phone: place.phoneNumber
            }, marker);

            this.map.setCenter(position);
            window.switchTab('search');
        } catch (error) {
            console.error('Error showing place on map:', error);
            this.showError('장소 정보를 불러오는데 실패했습니다: ' + error.message);
        }
    },

    // 장소 정보 표시
    displayPlaceInfo(place, marker) {
        if (this.currentInfoWindow) {
            this.currentInfoWindow.close();
        }

        const content = `
            <div class="info-window">
                <h3>${place.place_name}</h3>
                <p>${place.address_name}</p>
                ${place.phone ? `<p>📞 ${place.phone}</p>` : ''}
                ${place.road_address_name ? `<p>🚗 ${place.road_address_name}</p>` : ''}
            </div>
        `;

        const infowindow = new kakao.maps.InfoWindow({
            content: content,
            removable: true
        });

        infowindow.open(this.map, marker);
        this.currentInfoWindow = infowindow;
    },

    // API 응답 처리
    async handleApiResponse(response) {
        try {
            const text = await response.text();
            return text ? JSON.parse(text) : {};
        } catch (error) {
            console.error('API 응답 처리 중 에러:', error);
            throw error;
        }
    },

    // 에러 처리
    showError(message) {
        const modal = document.getElementById('error-modal');
        const messageElement = document.getElementById('error-message');
        if (modal && messageElement) {
            messageElement.textContent = message;
            modal.style.display = 'block';
        } else {
            alert(message);
        }
    },

    showSuccess(message) {
        alert(message);
    }
};


// API 응답 처리 함수
async function handleApiResponse(response) {
    try {
        const text = await response.text();
        if (!text) {
            throw new Error('빈 응답이 반환되었습니다');
        }
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error('JSON 파싱 에러:', e);
            console.log('받은 응답:', text);
            throw new Error('서버 응답을 처리할 수 없습니다');
        }
    } catch (error) {
        console.error('API 응답 처리 중 에러:', error);
        throw error;
    }
}

// 지도 초기화 함수
window.initMaps = function() {
    if (typeof kakao === 'undefined') {
        console.error('Kakao maps API not loaded');
        return;
    }

    kakao.maps.load(() => {
        window.CooperationMap.initialize();
    });
};

// 이벤트 리스너 설정
window.CooperationMap.setupEventListeners = function() {
    // 탭 전환 이벤트
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => window.switchTab(tab.dataset.tab));
    });

    // 검색 입력 이벤트
    const keywordInput = document.getElementById('keyword');
    if (keywordInput) {
        keywordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                window.searchPlaces();
            }
        });
    }

    // 검색 버튼 이벤트
    const searchButton = document.querySelector('.search-button');
    if (searchButton) {
        searchButton.addEventListener('click', window.searchPlaces);
    }
};


// 성공 메시지 표시
function showSuccess(message) {
    alert(message);
}

// 에러 모달 닫기
window.closeErrorModal = function() {
    window.CooperationMap.closeErrorModal();
};

// 탭 전환
window.switchTab = function(tabId) {
    const sections = document.querySelectorAll('.content-section');
    const tabs = document.querySelectorAll('.tab');
    
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.getElementById(`${tabId}-section`).classList.add('active');
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
};

// 장소 검색
window.searchPlaces = function() {
    window.CooperationMap.searchPlaces();
};

// 검색 콜백
function placesSearchCallback(data, status) {
    if (status === kakao.maps.services.Status.OK) {
        displayPlaces(data);
    } else if (status === kakao.maps.services.Status.ZERO_RESULT) {
        showError('검색 결과가 존재하지 않습니다.');
    } else if (status === kakao.maps.services.Status.ERROR) {
        showError('검색 중 오류가 발생했습니다.');
    }
}

// 장소 저장
window.savePlace = function(place) {
    window.CooperationMap.savePlace(place);
};

// 저장된 장소 불러오기
async function loadSavedPlaces() {
    try {
        const response = await fetch('/saved-places', {
            headers: {
                'Accept': 'application/json'
            }
        });

        const data = await handleApiResponse(response);

        if (!Array.isArray(data)) {
            throw new Error('올바르지 않은 데이터 형식입니다');
        }

        displaySavedPlaces(data);

        if (map) {
            removeMarkers();
            const bounds = new kakao.maps.LatLngBounds();
            let hasValidPlaces = false;

            data.forEach(place => {
                if (!place.location?.coordinates || 
                    !Array.isArray(place.location.coordinates) || 
                    place.location.coordinates.length !== 2) {
                    return;
                }

                const [longitude, latitude] = place.location.coordinates;
                const position = new kakao.maps.LatLng(latitude, longitude);
                const marker = addMarker(position);
                bounds.extend(position);
                hasValidPlaces = true;

                kakao.maps.event.addListener(marker, 'click', () => {
                    if (currentInfoWindow) {
                        currentInfoWindow.close();
                    }

                    const infowindow = new kakao.maps.InfoWindow({
                        content: `
                            <div class="info-window">
                                <h3>${place.placeName || '이름 없음'}</h3>
                                <p>${place.addressName || '주소 없음'}</p>
                                ${place.phoneNumber ? `<p>📞 ${place.phoneNumber}</p>` : ''}
                                ${place.category ? `<p>🏷️ ${place.category}</p>` : ''}
                            </div>
                        `,
                        removable: true
                    });

                    infowindow.open(map, marker);
                    currentInfoWindow = infowindow;
                });
            });

            if (hasValidPlaces) {
                map.setBounds(bounds);
            }
        }
    } catch (error) {
        console.error('Error loading saved places:', error);
        showError('저장된 장소를 불러오는데 실패했습니다: ' + error.message);
    }
}

// 장소 삭제
window.deletePlace = function(placeId) {
    window.CooperationMap.deletePlace(placeId);
};

// 검색 결과 표시
function displayPlaces(places) {
    const listEl = document.getElementById('places-list');
    const bounds = new kakao.maps.LatLngBounds();

    removeMarkers();
    listEl.innerHTML = '';

    places.forEach((place, index) => {
        const placePosition = new kakao.maps.LatLng(place.y, place.x);
        const marker = addMarker(placePosition, index);
        bounds.extend(placePosition);

        const itemEl = createPlaceItem(place);
        listEl.appendChild(itemEl);

        kakao.maps.event.addListener(marker, 'click', () => {
            displayPlaceInfo(place, marker);
        });
    });

    map.setBounds(bounds);
}

// 마커 생성
function addMarker(position, idx) {
    const marker = new kakao.maps.Marker({
        position: position,
        clickable: true
    });

    marker.setMap(map);
    markers.push(marker);
    return marker;
}

// 마커 제거
function removeMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
}

// 장소 아이템 UI 생성
function createPlaceItem(place) {
    const itemEl = document.createElement('div');
    itemEl.className = 'place-item';
    
    const infoEl = document.createElement('div');
    infoEl.className = 'place-info';
    
    const nameEl = document.createElement('div');
    nameEl.className = 'place-name';
    nameEl.textContent = place.place_name;
    
    const addressEl = document.createElement('div');
    addressEl.className = 'place-address';
    addressEl.textContent = place.address_name;
    
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'action-buttons';
    
    const saveButton = document.createElement('button');
    saveButton.textContent = '저장';
    saveButton.className = 'action-button save-button';
    saveButton.onclick = () => savePlace(place);
    
    buttonContainer.appendChild(saveButton);
    infoEl.appendChild(nameEl);
    infoEl.appendChild(addressEl);
    itemEl.appendChild(infoEl);
    itemEl.appendChild(buttonContainer);
    
    return itemEl;
}

// 저장된 장소 표시
function displaySavedPlaces(places) {
    const listEl = document.getElementById('saved-places-list');
    if (!listEl) return;

    listEl.innerHTML = '';

    if (!Array.isArray(places) || places.length === 0) {
        listEl.innerHTML = '<p class="no-places">저장된 장소가 없습니다.</p>';
        return;
    }

    places.forEach(place => {
        if (!place._id) {
            console.warn('장소 ID 없음:', place);
            return;
        }

        const itemEl = document.createElement('div');
        itemEl.className = 'place-item';
        
        itemEl.innerHTML = `
            <div class="place-info">
                <div class="place-name">${place.placeName || '이름 없음'}</div>
                <div class="place-address">${place.addressName || '주소 없음'}</div>
                ${place.phoneNumber ? `<div class="place-phone">📞 ${place.phoneNumber}</div>` : ''}
                ${place.category ? `<div class="place-category">🏷️ ${place.category}</div>` : ''}
            </div>
            <div class="action-buttons">
                <button onclick="showOnMap('${place._id}')" class="action-button">지도에서 보기</button>
                <button onclick="deletePlace('${place._id}')" class="action-button delete-button">삭제</button>
            </div>
        `;

        listEl.appendChild(itemEl);
    });
}

// 지도에서 특정 장소 보기
async function showOnMap(placeId) {
    try {
        console.log('Showing place on map:', placeId);
        const response = await fetch(`/saved-places/${placeId}`, {
            headers: {
                'Accept': 'application/json'
            }
        });

        const place = await handleApiResponse(response);
        console.log('Place details:', place);

        if (!place.location?.coordinates) {
            throw new Error('잘못된 장소 데이터입니다');
        }

        const position = new kakao.maps.LatLng(
            place.location.coordinates[1],
            place.location.coordinates[0]
        );

        if (currentInfoWindow) {
            currentInfoWindow.close();
        }

        const marker = new kakao.maps.Marker({ position });
        marker.setMap(map);
        markers.push(marker);

        const infowindow = new kakao.maps.InfoWindow({
            content: `
                <div class="info-window">
                    <h3>${place.placeName || '이름 없음'}</h3>
                    <p>${place.addressName || '주소 없음'}</p>
                    ${place.phoneNumber ? `<p>📞 ${place.phoneNumber}</p>` : ''}
                    ${place.roadAddressName ? `<p>🚗 ${place.roadAddressName}</p>` : ''}
                    ${place.category ? `<p>🏷️ ${place.category}</p>` : ''}
                </div>
            `,
            removable: true
        });

        infowindow.open(map, marker);
        currentInfoWindow = infowindow;

        map.setCenter(position);
        switchTab('search');
    } catch (error) {
        console.error('Error showing place on map:', error);
        showError('장소 정보를 불러오는데 실패했습니다: ' + error.message);
    }
}


// 인포윈도우 표시
function displayPlaceInfo(place, marker) {
    if (currentInfoWindow) {
        currentInfoWindow.close();
    }

    const content = `
        <div class="info-window">
            <h3>${place.place_name}</h3>
            <p>${place.address_name}</p>
            ${place.phone ? `<p>📞 ${place.phone}</p>` : ''}
            ${place.road_address_name ? `<p>🚗 ${place.road_address_name}</p>` : ''}
        </div>
    `;

    const infowindow = new kakao.maps.InfoWindow({
        content: content,
        removable: true
    });

    infowindow.open(map, marker);
    currentInfoWindow = infowindow;
}

window.searchPlaces = function() {
    window.CooperationMap.searchPlaces();
};