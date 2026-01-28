import './list-card-settings.css'
import { useNavigate } from 'react-router-dom';

interface ListProps {
    title: string
    options: Option[]
    icon: string
}
type Option = {
    name: string
    pathName: string
}
function Profile({ title, options, icon }: ListProps) {
    const navigate = useNavigate()
    return (
        <div className="container--list">
            <header className="header--list">
                <div className='button__icon--list'>
                    <img src={icon} alt="icon"className='img'/>
                </div>
                <h1 className="header__title--list">{title}</h1>
            </header>
            <ul className="list__father">
                {options.map((option) => {
                    return (
                        <li
                            key={option.pathName}
                            className="list__son"
                            onClick={() => navigate(option.pathName)}
                        >
                            {option.name}
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
export default Profile
