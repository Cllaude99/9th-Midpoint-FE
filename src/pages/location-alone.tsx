import Button from '@/components/button';
import KakaoMap from '@/components/kakao-map';
import Login from '@/components/login';
import { loginAtom } from '@/stores/login-state';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAtomValue } from 'jotai';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import Parasol from '@/assets/imgs/Location/parasol.svg?react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { toast, ToastContainer } from 'react-toastify';

// 입력란의 형식
interface IFriendList {
  readonly siDo: string;
  readonly siGunGu: string;
  readonly roadNameAddress: string;
  readonly addressLat: number;
  readonly addressLong: number;
}

// 입력 폼으로 부터 받은 값의 형식
interface IForm {
  readonly friendList: IFriendList[];
}

// 입력란의 기본 형태 템플릿
const default_format: IFriendList = {
  siDo: '',
  siGunGu: '',
  roadNameAddress: '',
  addressLat: 0,
  addressLong: 0,
};

export default function LocationAlone() {
  const isLogin = useAtomValue(loginAtom); // 로그인 여부 확인을 위한 변수
  const [isLoading, setIsLoading] = useState(false); // login form제출 상태
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number }[]>([]); // 사용자들의 좌표 목록
  const { control, register, handleSubmit, setValue, watch } = useForm<IForm>({
    defaultValues: {
      friendList: [default_format],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'friendList',
  });

  // 주소 검색하는 함수
  const openAddressSearch = (index: number) => {
    new window.daum.Postcode({
      oncomplete: function (data: any) {
        const fullAddress = data.roadAddress;
        const siDo = data.sido;
        const siGunGu = data.sigungu;
        const roadNameAddress = data.roadAddress;

        // Kakao 지도 API를 사용하여 위도와 경도 가져오기
        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.addressSearch(fullAddress, function (result: any, status: any) {
          if (status === window.kakao.maps.services.Status.OK) {
            const addressLat = parseFloat(result[0].y);
            const addressLong = parseFloat(result[0].x);

            // 주소와 좌표 설정
            setValue(`friendList.${index}.siDo`, siDo);
            setValue(`friendList.${index}.siGunGu`, siGunGu);
            setValue(`friendList.${index}.roadNameAddress`, roadNameAddress);
            setValue(`friendList.${index}.addressLat`, addressLat);
            setValue(`friendList.${index}.addressLong`, addressLong);

            setCoordinates((prev) => {
              const newCoordinates = [...prev];
              newCoordinates[index] = { lat: addressLat, lng: addressLong };
              return newCoordinates;
            });
          }
        });
      },
    }).open();
  };

  // 중간지점찾기 API 요청
  const { mutate: searchMiddlePoint } = useMutation({
    mutationFn: (data: any) => {
      return axios.post('https://www.api.cotato-midpoint.site/api/middle-points', data);
    },
    onSuccess: (data, variable) => {
      console.log('API 요청 성공');
      console.log('중간지점찾기 API 요청시 보낸 데이터', variable);
      console.log('중간지점찾기 API 요청 이후 받은 응답 데이터', data);
    },
    onError: (error) => {
      console.error(`중간 지점 결과 조회 API 요청 실패, 에러명 : ${error}`);
      setIsLoading(false);
    },
  });

  // 중간지점찾기 버튼 클릭시 수행되는 함수
  const onSubmit = (data: IForm) => {
    setIsLoading(true);

    const allFieldsFilled = data.friendList.every(
      (friend) => friend.roadNameAddress && friend.siDo && friend.siGunGu && friend.addressLat && friend.addressLong,
    );

    if (!allFieldsFilled) {
      setIsLoading(false);
      toast.error('장소를 모두 포함해주세요!');
      return;
    }

    const submissionData = data.friendList.map(({ siDo, siGunGu, roadNameAddress, addressLat, addressLong }) => ({
      siDo,
      siGunGu,
      roadNameAddress,
      addressLat,
      addressLong,
    }));

    console.log('중간지점 찾기 요청시 서버로 보내는 값', submissionData);

    searchMiddlePoint(submissionData, {
      onSuccess: () => {
        console.log('2번째로 불림- API 요청 성공');
      },
      onError: (error) => {
        console.error(`2번째로 불림 중간 지점 결과 조회 API 요청 실패, 에러명 : ${error}`);
        setIsLoading(false);
      },
    });
  };

  return (
    <>
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover
        draggable
      />
      {isLogin ? (
        <Login />
      ) : (
        <div className="grid w-4/5 gap-3 grid-cols-2 grid-rows-[auto_1fr]">
          <div className="bg-[#F8F8FB] rounded-2xl shadow-lg max-h-[500px] flex flex-col justify-between gap-2 px-1 pt-10 row-span-2">
            <div className="flex flex-col items-center gap-2">
              <Parasol />
              <h1 className="text-2xl font-semibold text-[#1A3C95]">모임정보 입력</h1>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-grow gap-6 py-1 overflow-y-auto">
              {fields.map((field, index) => (
                <div key={field.id}>
                  <h2 className="flex items-center justify-between text-lg font-semibold">
                    <span>친구 {index + 1} </span>
                    {fields.length > 1 && <XMarkIcon className="cursor-pointer size-4" onClick={() => remove(index)} />}
                  </h2>
                  <div className="relative w-full overflow-x-auto">
                    <div
                      className={`flex items-center min-w-full min-h-10 px-3 bg-white w-max border-none rounded-lg cursor-pointer ${
                        watch(`friendList.${index}.roadNameAddress`) ? 'text-black' : 'text-gray-500'
                      }`}
                      onClick={() => openAddressSearch(index)}
                    >
                      {watch(`friendList.${index}.roadNameAddress`) || '출발 장소'}
                    </div>
                    <input type="hidden" {...register(`friendList.${index}.roadNameAddress` as const)} />
                  </div>
                </div>
              ))}
            </form>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => append(default_format)}
                className="w-full rounded-lg primary-btn min-h-10"
              >
                친구 추가하기
              </button>
              <Button isLoading={isLoading} text="중간 지점 찾기" onClick={handleSubmit(onSubmit)} />
            </div>
          </div>
          <div className="h-[500px] shadow-lg rounded-2xl row-span-2">
            <KakaoMap coordinates={coordinates} />
          </div>
        </div>
      )}
    </>
  );
}
