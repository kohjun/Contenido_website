// 전역 객체 초기화 (Naver Maps SDK 기반 제휴 지도 제어 객체)
window.CooperationMap = {
    // 상태 변수들
    map: null,
    markers: [],
    places: null, // Kakao Places search helper
    isMapInitialized: false,
    currentInfoWindow: null,
    selectedPlace: null,
    selectedCapacity: null,
    selectedFacilities: new Set(),
    mappingEventId: null,
    mappingEventTitle: null,
    activeTab: 'saved', // 기본 활성 탭
    allSavedPlaces: [],
    allEndedEvents: [],

    showPlaceInfoModal(place) {
        this.selectedPlace = place;
        this.selectedCapacity = null;
        this.selectedFacilities.clear();

        // 모달 초기화
        const modal = document.getElementById('place-info-modal');
        if (!modal) return;
        
        const capacityButtons = modal.querySelectorAll('.capacity-button');
        const facilityButtons = modal.querySelectorAll('.facility-button');

        capacityButtons.forEach(button => button.classList.remove('selected'));
        facilityButtons.forEach(button => button.classList.remove('selected'));

        modal.style.display = 'block';
    },

    closePlaceInfoModal() {
        const modal = document.getElementById('place-info-modal');
        if (modal) modal.style.display = 'none';
        
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
        if (!this.map) return null;
        
        const marker = new naver.maps.Marker({
            position: position,
            map: this.map
        });
        this.markers.push(marker);
        return marker;
    },

    removeMarkers() {
        this.markers.forEach(marker => marker.setMap(null));
        this.markers = [];
        this.placeMarkers = {};
    },

    // 장소 검색 관련 메서드 (서버 사이드 프록시 API 활용 및 탭별 필터링 기능)
    async searchPlaces() {
        if (!this.isMapInitialized) {
            this.showError('지도가 아직 초기화되지 않았습니다.');
            return;
        }

        const keyword = document.getElementById('keyword').value.trim();
        if (!keyword) {
            // 만약 검색어가 비어 있으면 전체 목록을 다시 보여줍니다.
            if (this.activeTab === 'saved') {
                this.renderSavedPlacesAndMarkers(this.allSavedPlaces || []);
            } else if (this.activeTab === 'ended-events') {
                this.displayEndedEvents(this.allEndedEvents || []);
            } else {
                this.showError('검색어를 입력해주세요.');
            }
            return;
        }

        if (this.activeTab === 'saved') {
            // 1. 이벤트 장소 목록 탭: 로컬 저장된 목록에서만 검색 (필터링)
            const filtered = (this.allSavedPlaces || []).filter(place => {
                const name = place.placeName || '';
                const address = place.addressName || '';
                const roadAddress = place.roadAddressName || '';
                const memo = place.memo || '';
                const category = place.category || '';
                return name.toLowerCase().includes(keyword.toLowerCase()) || 
                       address.toLowerCase().includes(keyword.toLowerCase()) || 
                       roadAddress.toLowerCase().includes(keyword.toLowerCase()) ||
                       memo.toLowerCase().includes(keyword.toLowerCase()) ||
                       category.toLowerCase().includes(keyword.toLowerCase());
            });
            this.renderSavedPlacesAndMarkers(filtered);
        } else if (this.activeTab === 'ended-events') {
            // 2. 이벤트 연동 탭: 로컬 연동된 이벤트 목록에서 검색 (필터링)
            const filtered = (this.allEndedEvents || []).filter(event => {
                const title = event.title || '';
                const place = event.place || '';
                const mappedPlaceName = (event.isMapped && event.savedPlace && event.savedPlace.placeName) ? event.savedPlace.placeName : '';
                return title.toLowerCase().includes(keyword.toLowerCase()) || 
                       place.toLowerCase().includes(keyword.toLowerCase()) ||
                       mappedPlaceName.toLowerCase().includes(keyword.toLowerCase());
            });
            this.displayEndedEvents(filtered);
        } else {
            // 3. 신규 추가 탭: 카카오 지도 검색 (API 활용)
            try {
                const response = await fetch(`/savedPlaces/search?keyword=${encodeURIComponent(keyword)}`);
                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.message || '검색에 실패했습니다.');
                }
                const data = await response.json();
                
                if (data && data.length > 0) {
                    this.displayPlaces(data);
                } else {
                    this.showError('검색 결과가 존재하지 않습니다.');
                }
            } catch (error) {
                console.error('Error searching places:', error);
                this.showError(error.message);
            }
        }
    },

    displayPlaces(places) {
        const listEl = document.getElementById('places-list');
        if (!listEl) return;
        
        const bounds = new naver.maps.LatLngBounds();

        this.removeMarkers();
        listEl.innerHTML = '';

        places.forEach((place) => {
            const placePosition = new naver.maps.LatLng(place.y, place.x);
            const marker = this.addMarker(placePosition);
            bounds.extend(placePosition);

            const itemEl = this.createPlaceItem(place);
            listEl.appendChild(itemEl);

            if (marker) {
                naver.maps.Event.addListener(marker, 'click', () => {
                    this.displayPlaceInfo(place, marker);
                });
            }
        });

        if (this.map && places.length > 0) {
            this.map.fitBounds(bounds);
        }
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

        const infowindow = new naver.maps.InfoWindow({
            content: content
        });

        infowindow.open(this.map, marker);
        this.currentInfoWindow = infowindow;
    },

    savePlace(place) {
        this.selectedPlace = place;
        this.showPlaceInfoModal(place);
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
                facilities: Array.from(this.selectedFacilities),
                placeType: 'event'
            };
            
            if (this.mappingEventId) {
                placeData.eventId = this.mappingEventId;
            }

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
            
            if (this.mappingEventId) {
                this.cancelMappingMode();
            } else {
                await this.loadSavedPlaces();
            }
        } catch (error) {
            console.error('Error saving place:', error);
            this.showError('장소 저장에 실패했습니다: ' + error.message);
        }
    },

    async loadSavedPlaces() {
        try {
            const response = await fetch('/savedPlaces?placeType=event');
            const data = await this.handleApiResponse(response);

            if (!Array.isArray(data)) {
                throw new Error('올바르지 않은 데이터 형식입니다');
            }

            this.allSavedPlaces = data;
            this.renderSavedPlacesAndMarkers(data);
        } catch (error) {
            console.error('Error loading saved places:', error);
            this.showError('저장된 장소를 불러오는데 실패했습니다: ' + error.message);
        }
    },

    renderSavedPlacesAndMarkers(data) {
        this.displaySavedPlaces(data);

        // 지도 위에 제휴처 마커 그리기 및 영역 줌인/줌아웃 조절
        if (this.map) {
            this.removeMarkers();
            this.placeMarkers = {}; // placeId별 마커 매핑 초기화
            const bounds = new naver.maps.LatLngBounds();
            let hasValidPlaces = false;

            data.forEach(place => {
                if (!place.location?.coordinates || 
                    !Array.isArray(place.location.coordinates) || 
                    place.location.coordinates.length !== 2) {
                    return;
                }

                const [longitude, latitude] = place.location.coordinates;
                const position = new naver.maps.LatLng(latitude, longitude);
                const marker = this.addMarker(position);
                
                if (place._id) {
                    this.placeMarkers[place._id.toString()] = marker;
                }
                
                bounds.extend(position);
                hasValidPlaces = true;

                if (marker) {
                    naver.maps.Event.addListener(marker, 'click', () => {
                        this.openPlaceInfoWindow(place, marker);
                    });
                }
            });

            if (hasValidPlaces) {
                this.map.fitBounds(bounds);
            }
        }
    },

    openPlaceInfoWindow(place, marker) {
        if (this.currentInfoWindow) {
            this.currentInfoWindow.close();
        }

        const infowindow = new naver.maps.InfoWindow({
            content: `
                <div class="info-window">
                    <h3>${place.placeName || '이름 없음'}</h3>
                    <p class="road-address">${place.roadAddressName || place.addressName || '주소 없음'}</p>
                    ${place.phoneNumber ? `<p class="phone">📞 ${place.phoneNumber}</p>` : ''}
                    ${place.discountRate ? `<p class="discount">🏷️ 혜택: ${place.discountRate}</p>` : ''}
                    ${place.memo ? `<p class="memo">${place.memo}</p>` : ''}
                </div>
            `
        });

        infowindow.open(this.map, marker);
        this.currentInfoWindow = infowindow;
        this.collapseBottomSheet();
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

            const position = new naver.maps.LatLng(
                place.location.coordinates[1],
                place.location.coordinates[0]
            );

            this.removeMarkers();
            const marker = this.addMarker(position);

            if (this.currentInfoWindow) {
                this.currentInfoWindow.close();
            }

            const infowindow = new naver.maps.InfoWindow({
                content: `
                    <div class="info-window">
                        <h3>${place.placeName || '이름 없음'}</h3>
                        <p>${place.addressName || '주소 없음'}</p>
                        ${place.phoneNumber ? `<p>📞 ${place.phoneNumber}</p>` : ''}
                        ${place.roadAddressName ? `<p>🚗 ${place.roadAddressName}</p>` : ''}
                    </div>
                `
            });

            if (marker) {
                infowindow.open(this.map, marker);
            } else {
                infowindow.open(this.map, position);
            }
            this.currentInfoWindow = infowindow;

            this.map.setCenter(position);
            this.map.setZoom(16);
            this.switchTab('saved');
            this.collapseBottomSheet();
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
        
        const targetTab = document.querySelector(`.tab[data-tab="${tabId}"]`);
        if (targetTab) targetTab.classList.add('active');
        
        const targetSection = document.getElementById(`${tabId}-section`);
        if (targetSection) targetSection.classList.add('active');

        if (this.map) {
            this.map.refresh();
        }

        this.activeTab = tabId;

        // 탭 전환 시 검색 인풋 초기화
        const keywordInput = document.getElementById('keyword');
        if (keywordInput) {
            keywordInput.value = '';
        }

        if (tabId === 'saved') {
            this.loadSavedPlaces();
        } else if (tabId === 'ended-events') {
            this.loadEndedEvents();
        } else if (tabId === 'search') {
            const searchList = document.getElementById('places-list');
            if (searchList) {
                searchList.innerHTML = '<div class="empty-placeholder">검색어를 입력하고 검색 버튼을 눌러주세요.</div>';
            }
        }
    },

    // 모바일 바텀시트 토글/접기 메서드
    toggleBottomSheet() {
        const sidebarPanel = document.querySelector('.sidebar-panel');
        if (sidebarPanel) {
            sidebarPanel.classList.toggle('expanded');
        }
    },

    collapseBottomSheet() {
        const sidebarPanel = document.querySelector('.sidebar-panel');
        if (sidebarPanel) {
            sidebarPanel.classList.remove('expanded');
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

        // 탭 전환 이벤트
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // 모바일 바텀시트 헤더 클릭 이벤트
        const panelHeader = document.querySelector('.panel-header');
        if (panelHeader) {
            panelHeader.addEventListener('click', (e) => {
                if (window.innerWidth <= 768) {
                    if (!e.target.closest('#keyword') && !e.target.closest('.search-button') && !e.target.closest('.tab-nav')) {
                        this.toggleBottomSheet();
                    }
                }
            });
        }
    },

    // 지도 타입 변경 메서드
    setMapType(maptype) {
        const roadmapControl = document.getElementById('btnRoadmap');
        const skyviewControl = document.getElementById('btnSkyview');
        
        if (!this.map) return;

        if (maptype === 'roadmap') {
            this.map.setMapTypeId(naver.maps.MapTypeId.NORMAL);
            if (roadmapControl) roadmapControl.className = 'selected';
            if (skyviewControl) skyviewControl.className = '';
        } else {
            this.map.setMapTypeId(naver.maps.MapTypeId.HYBRID);
            if (skyviewControl) skyviewControl.className = 'selected';
            if (roadmapControl) roadmapControl.className = '';
        }
    },

    // 초기화
    initialize() {
        const loadingElement = document.getElementById('map-loading');
        if (loadingElement) {
            loadingElement.style.display = 'block';
        }

        // 지도 타입 컨트롤 이벤트 리스너 설정
        const btnRoadmap = document.getElementById('btnRoadmap');
        const btnSkyview = document.getElementById('btnSkyview');
        if (btnRoadmap) btnRoadmap.addEventListener('click', () => this.setMapType('roadmap'));
        if (btnSkyview) btnSkyview.addEventListener('click', () => this.setMapType('skyview'));

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
        const placeInfoModal = document.getElementById('place-info-modal');
        if (placeInfoModal) {
            placeInfoModal.addEventListener('click', (e) => {
                if (e.target.id === 'place-info-modal') {
                    this.closePlaceInfoModal();
                }
            });
        }

        try {
            const container = document.getElementById('map');
            if (!container) {
                throw new Error('Map container not found');
            }

            const options = {
                center: new naver.maps.LatLng(37.566826, 126.978656),
                zoom: 15,
                zoomControl: true,
                zoomControlOptions: {
                    position: naver.maps.Position.RIGHT_CENTER
                }
            };

            this.map = new naver.maps.Map(container, options);
            // 카카오 SDK 대신 서버 프록시 검색 방식을 사용합니다.
            this.places = null;

            this.isMapInitialized = true;
            this.setupEventListeners();
            this.loadSavedPlaces();

            if (loadingElement) {
                loadingElement.style.display = 'none';
            }

            console.log('Naver Map (Hybrid Search) initialization complete');
        } catch (error) {
            console.error('Error initializing map:', error);
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            this.showError('지도 초기화 중 오류가 발생했습니다: ' + error.message);
        }
    },

    // 종료된 이벤트 로드
    async loadEndedEvents() {
        const listContainer = document.getElementById('ended-events-list');
        if (!listContainer) return;
        listContainer.innerHTML = '<div class="loading-placeholder">종료된 이벤트를 불러오는 중...</div>';

        try {
            const response = await fetch('/savedPlaces/ended-events');
            const data = await this.handleApiResponse(response);

            if (!Array.isArray(data)) {
                throw new Error('올바르지 않은 데이터 형식입니다.');
            }

            this.allEndedEvents = data;
            this.displayEndedEvents(data);
        } catch (error) {
            console.error('Error loading ended events:', error);
            listContainer.innerHTML = `<div class="error-message">종료된 이벤트를 불러오는데 실패했습니다: ${error.message}</div>`;
        }
    },

    // 종료된 이벤트 목록 표시
    displayEndedEvents(events) {
        const listContainer = document.getElementById('ended-events-list');
        if (!listContainer) return;

        if (events.length === 0) {
            listContainer.innerHTML = '<div class="empty-placeholder">종료된 이벤트가 존재하지 않습니다.</div>';
            return;
        }

        listContainer.innerHTML = '';
        events.forEach(event => {
            const card = document.createElement('div');
            card.className = 'place-item';
            
            const eventTitleSafe = event.title.replace(/'/g, "\\'");
            const eventPlaceSafe = event.place ? event.place.replace(/'/g, "\\'") : '';
            const dateStr = event.date ? new Date(event.date).toISOString().substring(0, 10) : '-';

            let actionHtml = '';
            let mappingInfoHtml = '';

            if (event.isMapped && event.savedPlace) {
                mappingInfoHtml = `<div class="event-meta-info" style="color: var(--c-brand); font-weight: 600;">🔗 연동된 제휴처: ${event.savedPlace.placeName}</div>`;
                actionHtml = `<button class="action-btn map-btn" style="flex: 1;" onclick="window.CooperationMap.focusMappedPlace('${event.savedPlace._id}')">위치 보기</button>`;
            } else {
                actionHtml = `<button class="action-btn link-btn" style="flex: 1;" onclick="window.CooperationMap.startMappingMode('${event._id}', '${eventTitleSafe}', '${eventPlaceSafe}')">지도에서 연동</button>`;
            }

            card.innerHTML = `
                <div class="place-info">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                        <div class="place-name">${event.title}</div>
                        <span class="badge ${event.isMapped ? 'badge-mapped' : 'badge-unmapped'}">
                            ${event.isMapped ? '연동 완료' : '미연동'}
                        </span>
                    </div>
                    <div class="event-meta-info">📅 일시: ${dateStr}</div>
                    <div class="event-meta-info">📍 등록 장소: ${event.place || '없음'}</div>
                    ${mappingInfoHtml}
                </div>
                <div class="place-actions" style="margin-top: 8px; display: flex; gap: 8px;">
                    ${actionHtml}
                </div>
            `;
            listContainer.appendChild(card);
        });
    },

    // 연동 모드 시작
    startMappingMode(eventId, eventTitle, eventPlace) {
        this.mappingEventId = eventId;
        this.mappingEventTitle = eventTitle;

        // 배너 설정 및 표시
        const banner = document.getElementById('mapping-status-banner');
        const titleSpan = document.getElementById('mapping-event-title');
        if (banner && titleSpan) {
            titleSpan.textContent = eventTitle;
            banner.style.display = 'flex';
        }

        // '신규 추가' 탭으로 전환
        this.switchTab('search');

        // 장소 검색어 입력 및 자동 검색
        const keywordInput = document.getElementById('keyword');
        if (keywordInput) {
            keywordInput.value = eventPlace || '';
            this.searchPlaces();
        }
    },

    // 연동 모드 해제
    cancelMappingMode() {
        this.mappingEventId = null;
        this.mappingEventTitle = null;

        const banner = document.getElementById('mapping-status-banner');
        if (banner) {
            banner.style.display = 'none';
        }

        // 이벤트 연동 탭으로 복귀하고 다시 로드
        this.switchTab('ended-events');
    },

    // 연동된 제휴처 지도상에 포커싱
    async focusMappedPlace(savedPlaceId) {
        try {
            const marker = this.placeMarkers ? this.placeMarkers[savedPlaceId] : null;
            if (!marker) {
                // 혹시 제휴처 목록이 아직 다 로딩되지 않은 경우를 대비해 savedPlaces API 호출하여 확인
                const response = await fetch(`/savedPlaces/${savedPlaceId}`);
                if (!response.ok) {
                    throw new Error('장소 정보를 불러오는데 실패했습니다.');
                }
                const place = await response.json();
                
                // 마커가 없으므로 지도만 포커싱하고 일반 InfoWindow 오픈
                if (!place.location?.coordinates || place.location.coordinates.length !== 2) {
                    throw new Error('좌표 정보가 올바르지 않습니다.');
                }
                const [longitude, latitude] = place.location.coordinates;
                const position = new naver.maps.LatLng(latitude, longitude);
                
                if (this.currentInfoWindow) {
                    this.currentInfoWindow.close();
                }
                const infowindow = new naver.maps.InfoWindow({
                    content: `
                        <div class="info-window">
                            <h3>${place.placeName || '이름 없음'}</h3>
                            <p class="road-address">${place.roadAddressName || place.addressName || '주소 없음'}</p>
                            ${place.phoneNumber ? `<p class="phone">📞 ${place.phoneNumber}</p>` : ''}
                            ${place.discountRate ? `<p class="discount">🏷️ 혜택: ${place.discountRate}</p>` : ''}
                            ${place.memo ? `<p class="memo">${place.memo}</p>` : ''}
                        </div>
                    `
                });
                infowindow.open(this.map, position);
                this.currentInfoWindow = infowindow;
                this.map.setCenter(position);
                this.map.setZoom(16);
                this.collapseBottomSheet();
                return;
            }

            // 마커가 있는 경우 마커를 타겟으로 정보창 열기
            // savedPlaces 조회해서 상세 정보 채우기
            const response = await fetch(`/savedPlaces/${savedPlaceId}`);
            if (!response.ok) {
                throw new Error('장소 정보를 불러오는데 실패했습니다.');
            }
            const place = await response.json();

            this.openPlaceInfoWindow(place, marker);
            this.map.setCenter(marker.getPosition());
            this.map.setZoom(16);
            this.collapseBottomSheet();
        } catch (error) {
            console.error('Error focusing mapped place:', error);
            this.showError(error.message);
        }
    }
};