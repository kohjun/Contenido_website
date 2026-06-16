// 전역 객체 초기화
window.CooperationMap = {
    // 상태 변수들
    map: null,
    routeMap: null,
    markers: [],
    places: null,
    routeMarkers: [],
    routePolyline: null,
    isMapInitialized: false,
    currentInfoWindow: null,
    selectedPlace: null,
    selectedCapacity: null,
    selectedFacilities: new Set(),

    showPlaceInfoModal(place) {
        this.selectedPlace = place;
        this.selectedCapacity = null;
        this.selectedFacilities.clear();

        // 모달 초기화
        const modal = document.getElementById('place-info-modal');
        const capacityButtons = modal.querySelectorAll('.capacity-button');
        const facilityButtons = modal.querySelectorAll('.facility-button');

        capacityButtons.forEach(button => button.classList.remove('selected'));
        facilityButtons.forEach(button => button.classList.remove('selected'));

        modal.style.display = 'block';
    },

    closePlaceInfoModal() {
        document.getElementById('place-info-modal').style.display = 'none';
        this.selectedPlace = null;
        this.selectedCapacity = null;
        this.selectedFacilities.clear();
    },

    toggleCapacity(button) {
        const capacityButtons = document.querySelectorAll('.capacity-button');
        capacityButtons.forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
        this.selectedCapacity = button.dataset.capacity;
    },

    toggleFacility(button) {
        const facility = button.dataset.facility;
        if (button.classList.contains('selected')) {
            button.classList.remove('selected');
            this.selectedFacilities.delete(facility);
        } else {
            button.classList.add('selected');
            this.selectedFacilities.add(facility);
        }
    },
    
    // 마커 관리 메서드
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

    // 장소 검색 관련 메서드
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

        this.places.keywordSearch(keyword, (data, status) => this.placesSearchCallback(data, status));
    },

    placesSearchCallback(data, status) {
        if (status === kakao.maps.services.Status.OK) {
            this.displayPlaces(data);
        } else if (status === kakao.maps.services.Status.ZERO_RESULT) {
            this.showError('검색 결과가 존재하지 않습니다.');
        } else if (status === kakao.maps.services.Status.ERROR) {
            this.showError('검색 중 오류가 발생했습니다.');
        }
    },

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
                <button onclick="window.CooperationMap.savePlace(${JSON.stringify(place).replace(/"/g, '&quot;')})" class="action-button save-button">저장</button>
            </div>
        `;
        
        return itemEl;
    },

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

    // 저장된 장소 관련 메서드
    async savePlaceWithInfo() {
        if (!this.selectedPlace || !this.selectedCapacity) {
            this.showError('수용 인원을 선택해주세요.');
            return;
        }

        try {
            const placeData = {
                placeId: this.selectedPlace.id,
                placeName: this.selectedPlace.place_name,
                addressName: this.selectedPlace.address_name,
                roadAddressName: this.selectedPlace.road_address_name,
                phoneNumber: this.selectedPlace.phone,
                category: this.selectedPlace.category_name,
                longitude: parseFloat(this.selectedPlace.x),
                latitude: parseFloat(this.selectedPlace.y),
                capacity: this.selectedCapacity,
                facilities: Array.from(this.selectedFacilities)
            };
            const response = await fetch('/savedPlaces', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(placeData)
            });

            const result = await this.handleApiResponse(response);
            this.showSuccess(result.message || '장소가 저장되었습니다');
            this.closePlaceInfoModal();
            await this.loadSavedPlaces();
        } catch (error) {
            console.error('Error saving place:', error);
            this.showError('장소 저장에 실패했습니다: ' + error.message);
        }
    },

    async loadSavedPlaces() {
        try {
            const response = await fetch('/savedPlaces');
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
            
            // 시설 태그 생성
            const facilityTags = place.facilities?.map(facility => 
                `<span class="facility-tag">${facility}</span>`
            ).join('') || '';

            itemEl.innerHTML = `
                <div class="place-info">
                    <div class="place-name">${place.placeName || '이름 없음'}</div>
                    <div class="place-address">${place.addressName || '주소 없음'}</div>
                    ${place.phoneNumber ? `<div class="place-phone">📞 ${place.phoneNumber}</div>` : ''}
                    ${place.category ? `<div class="place-category">🏷️ ${place.category}</div>` : ''}
                    <div class="place-capacity">👥 ${this.formatCapacity(place.capacity)}</div>
                    <div class="facility-tags">${facilityTags}</div>
                </div>
                <div class="action-buttons">
                    <button onclick="window.CooperationMap.showOnMap('${place._id}')" class="action-button">지도에서 보기</button>
                    <button onclick="window.CooperationMap.deletePlace('${place._id}')" class="action-button delete-button">삭제</button>
                </div>
            `;

            listEl.appendChild(itemEl);
        });
    },
    formatCapacity(capacity) {
        switch(capacity) {
            case '~10': return '~10명';
            case '~30': return '~30명';
            case '~50': return '~50명';
            case '~100': return '~100명';
            default: return capacity;
        }
    },
    savePlace(place) {
        this.selectedPlace = place;
        this.showPlaceInfoModal(place);
    },
    async deletePlace(placeId) {
        if (!confirm('이 장소를 삭제하시겠습니까?')) {
            return;
        }

        try {
            const response = await fetch(`/savedPlaces/${placeId}`, {
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

    async showOnMap(placeId) {
        try {
            const response = await fetch(`/savedPlaces/${placeId}`);
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

            if (this.currentInfoWindow) {
                this.currentInfoWindow.close();
            }

            const infowindow = new kakao.maps.InfoWindow({
                content: `
                    <div class="info-window">
                        <h3>${place.placeName || '이름 없음'}</h3>
                        <p>${place.addressName || '주소 없음'}</p>
                        ${place.phoneNumber ? `<p>📞 ${place.phoneNumber}</p>` : ''}
                        ${place.roadAddressName ? `<p>🚗 ${place.roadAddressName}</p>` : ''}
                    </div>
                `,
                removable: true
            });

            infowindow.open(this.map, marker);
            this.currentInfoWindow = infowindow;

            this.map.setCenter(position);
            this.switchTab('search');
        } catch (error) {
            console.error('Error showing place on map:', error);
            this.showError('장소 정보를 불러오는데 실패했습니다: ' + error.message);
        }
    },

    // 탭 관리 메서드
    switchTab(tabId) {
        if (!this.isMapInitialized) {
            this.showError('지도가 아직 초기화되지 않았습니다.');
            return;
        }

        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
        
        document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(`${tabId}-section`).classList.add('active');

        if (tabId === 'search' && this.map) {
            this.map.relayout();
        } else if (tabId === 'route' && this.routeMap) {
            this.routeMap.relayout();
        }

        if (tabId === 'saved') {
            this.loadSavedPlaces();
        }
    },

    // 유틸리티 메서드
    async handleApiResponse(response) {
        try {
            const text = await response.text();
            return text ? JSON.parse(text) : {};
        } catch (error) {
            console.error('API 응답 처리 중 에러:', error);
            throw error;
        }
    },

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
    },

    closeErrorModal() {
        const modal = document.getElementById('error-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    setupEventListeners() {
        // 검색 이벤트
        const keywordInput = document.getElementById('keyword');
        if (keywordInput) {
            keywordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchPlaces();
                }
            });
        }

        // 검색 버튼 이벤트
        const searchButton = document.querySelector('.search-button');
        if (searchButton) {
            searchButton.addEventListener('click', () => this.searchPlaces());
        }
    },
    closeErrorModal() {
        const modal = document.getElementById('error-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    // 지도 타입 변경 메서드
    setMapType(maptype) {
        const roadmapControl = document.getElementById('btnRoadmap');
        const skyviewControl = document.getElementById('btnSkyview');
        
        if (maptype === 'roadmap') {
            this.map.setMapTypeId(kakao.maps.MapTypeId.ROADMAP);
            roadmapControl.className = 'selected';
            skyviewControl.className = '';
        } else {
            this.map.setMapTypeId(kakao.maps.MapTypeId.HYBRID);
            skyviewControl.className = 'selected';
            roadmapControl.className = '';
        }
    },

    // 지도 확대 메서드
    zoomIn() {
        if (this.map) {
            this.map.setLevel(this.map.getLevel() - 2);
        }
    },

    // 지도 축소 메서드
    zoomOut() {
        if (this.map) {
            this.map.setLevel(this.map.getLevel() + 2);
        }
    },
    // 초기화
    initialize() {
        const loadingElement = document.getElementById('map-loading');
        if (loadingElement) {
            loadingElement.style.display = 'block';
        }
         // 지도 타입 컨트롤 이벤트 리스너 설정
         document.getElementById('btnRoadmap').addEventListener('click', () => this.setMapType('roadmap'));
         document.getElementById('btnSkyview').addEventListener('click', () => this.setMapType('skyview'));
        // 수용 인원 버튼 이벤트 리스너
        document.querySelectorAll('.capacity-button').forEach(button => {
            button.addEventListener('click', () => this.toggleCapacity(button));
        });

        // 시설 버튼 이벤트 리스너
        document.querySelectorAll('.facility-button').forEach(button => {
            button.addEventListener('click', () => this.toggleFacility(button));
        });

        // ESC 키로 모달 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closePlaceInfoModal();
            }
        });

        // 모달 외부 클릭으로 닫기
        document.getElementById('place-info-modal').addEventListener('click', (e) => {
            if (e.target.id === 'place-info-modal') {
                this.closePlaceInfoModal();
            }
        });
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
    }
};

// 전역 함수들
window.searchPlaces = function() {
    window.CooperationMap.searchPlaces();
};

window.closeErrorModal = function() {
    window.CooperationMap.closeErrorModal();
};

window.switchTab = function(tabId) {
    window.CooperationMap.switchTab(tabId);
};

// 초기화 함수
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
        const response = await fetch('/savedPlaces', {
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